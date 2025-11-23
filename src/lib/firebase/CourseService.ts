import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import type { Summary } from './SummaryService';
import type { Document } from './DocumentService';

export interface Course {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
}

export interface CourseItem {
  id: string;
  courseId: string;
  itemId: string;
  itemType: 'summary' | 'document';
  assignedAt: Date;
}

interface CourseItemsResult {
  summaries: (Summary & { id: string })[];
  documents: (Document & { id: string })[];
}

class CourseService {
  private coursesCollection = 'courses';

  /**
   * Create a new course for a user
   */
  async createCourse(
    userId: string,
    name: string,
    description?: string,
    color?: string
  ): Promise<string> {
    try {
      if (!userId || !name.trim()) {
        throw new Error('User ID and course name are required');
      }

      const courseRef = doc(collection(db, this.coursesCollection));
      const now = new Date();

      await setDoc(courseRef, {
        userId,
        name: name.trim(),
        description: description?.trim() || '',
        color: color || '#3B82F6',
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        itemCount: 0,
      });

      return courseRef.id;
    } catch (err) {
      console.error('CourseService: Error creating course', err);
      throw err;
    }
  }

  /**
   * Get all courses for a user
   */
  async getUserCourses(userId: string): Promise<Course[]> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const q = query(
        collection(db, this.coursesCollection),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const courses: Course[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        courses.push({
          id: doc.id,
          userId: data.userId,
          name: data.name,
          description: data.description || '',
          color: data.color || '#3B82F6',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          itemCount: data.itemCount || 0,
        });
      });

      // Sort by createdAt descending (newest first)
      courses.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return courses;
    } catch (err) {
      console.error('CourseService: Error fetching user courses', err);
      throw err;
    }
  }

  /**
   * Get a single course by ID
   */
  async getCourse(courseId: string): Promise<Course | null> {
    try {
      if (!courseId) {
        throw new Error('Course ID is required');
      }

      const docRef = doc(db, this.coursesCollection, courseId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        name: data.name,
        description: data.description || '',
        color: data.color || '#3B82F6',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        itemCount: data.itemCount || 0,
      };
    } catch (err) {
      console.error('CourseService: Error fetching course', err);
      throw err;
    }
  }

  /**
   * Update a course
   */
  async updateCourse(
    courseId: string,
    updates: Partial<{
      name: string;
      description: string;
      color: string;
    }>
  ): Promise<void> {
    try {
      if (!courseId) {
        throw new Error('Course ID is required');
      }

      if (updates.name !== undefined) {
        updates.name = updates.name.trim();
      }

      const docRef = doc(db, this.coursesCollection, courseId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (err) {
      console.error('CourseService: Error updating course', err);
      throw err;
    }
  }

  /**
   * Delete a course (also unassigns all items from it)
   */
  async deleteCourse(courseId: string): Promise<void> {
    try {
      if (!courseId) {
        throw new Error('Course ID is required');
      }

      // First, unassign all items from this course
      await this.unassignAllItemsFromCourse(courseId);

      // Then delete the course
      const docRef = doc(db, this.coursesCollection, courseId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('CourseService: Error deleting course', err);
      throw err;
    }
  }

  /**
   * Assign a summary or document to a course
   * Updates the courseId field in the summaries or documents collection
   */
  async assignItemToCourse(
    userId: string,
    itemId: string,
    itemType: 'summary' | 'document',
    courseId: string
  ): Promise<void> {
    try {
      if (!userId || !itemId || !courseId) {
        throw new Error('User ID, item ID, and course ID are required');
      }

      const collectionName =
        itemType === 'summary' ? 'summaries' : 'documents';

      // Update the item to link it to the course
      const itemRef = doc(db, collectionName, itemId);
      await updateDoc(itemRef, {
        courseId,
        updatedAt: Timestamp.now(),
      });

      // Increment the course's itemCount
      const courseRef = doc(db, this.coursesCollection, courseId);
      const courseSnap = await getDoc(courseRef);
      if (courseSnap.exists()) {
        const currentCount = courseSnap.data().itemCount || 0;
        await updateDoc(courseRef, {
          itemCount: currentCount + 1,
          updatedAt: Timestamp.now(),
        });
      }
    } catch (err) {
      console.error('CourseService: Error assigning item to course', err);
      throw err;
    }
  }

  /**
   * Unassign an item from a course
   */
  async unassignItemFromCourse(
    itemId: string,
    itemType: 'summary' | 'document'
  ): Promise<void> {
    try {
      if (!itemId) {
        throw new Error('Item ID is required');
      }

      const collectionName =
        itemType === 'summary' ? 'summaries' : 'documents';

      const itemRef = doc(db, collectionName, itemId);
      const itemSnap = await getDoc(itemRef);

      if (!itemSnap.exists()) {
        throw new Error('Item not found');
      }

      const courseId = itemSnap.data().courseId;

      // Remove courseId from the item
      await updateDoc(itemRef, {
        courseId: null,
        updatedAt: Timestamp.now(),
      });

      // Decrement the course's itemCount if it was assigned
      if (courseId) {
        const courseRef = doc(db, this.coursesCollection, courseId);
        const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists()) {
          const currentCount = courseSnap.data().itemCount || 0;
          await updateDoc(courseRef, {
            itemCount: Math.max(0, currentCount - 1),
            updatedAt: Timestamp.now(),
          });
        }
      }
    } catch (err) {
      console.error('CourseService: Error unassigning item from course', err);
      throw err;
    }
  }

  /**
   * Get items assigned to a specific course
   * Queries both summaries and documents collections
   */
  async getCourseItems(
    courseId: string
  ): Promise<CourseItemsResult> {
    try {
      if (!courseId) {
        throw new Error('Course ID is required');
      }

      const summariesQuery = query(
        collection(db, 'summaries'),
        where('courseId', '==', courseId)
      );
      const documentsQuery = query(
        collection(db, 'documents'),
        where('courseId', '==', courseId)
      );

      const [summariesSnap, documentsSnap] = await Promise.all([
        getDocs(summariesQuery),
        getDocs(documentsQuery),
      ]);

      const summaries: (Summary & { id: string })[] = [];
      const documents: (Document & { id: string })[] = [];

      summariesSnap.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
        summaries.push({
          id: doc.id,
          userId: data.userId,
          fileName: data.fileName,
          fileHash: data.fileHash,
          fileSize: data.fileSize,
          fileType: data.fileType,
          summaryText: data.summaryText,
          createdAt,
          updatedAt,
        });
      });

      documentsSnap.forEach((doc) => {
        const data = doc.data();
        const uploadedAt = data.uploadedAt?.toDate ? data.uploadedAt.toDate() : new Date(data.uploadedAt);
        const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
        documents.push({
          id: doc.id,
          userId: data.userId,
          fileName: data.fileName,
          fileHash: data.fileHash,
          fileSize: data.fileSize,
          fileType: data.fileType,
          uploadedAt,
          updatedAt,
        });
      });

      // Sort both by creation date descending
      summaries.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      documents.sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );

      return { summaries, documents };
    } catch (err) {
      console.error('CourseService: Error fetching course items', err);
      throw err;
    }
  }

  /**
   * Unassign all items from a course (used when deleting a course)
   */
  private async unassignAllItemsFromCourse(courseId: string): Promise<void> {
    try {
      const { summaries, documents } = await this.getCourseItems(courseId);

      const batch = writeBatch(db);

      // Unassign all summaries
      summaries.forEach((summary) => {
        const ref = doc(db, 'summaries', summary.id);
        batch.update(ref, {
          courseId: null,
          updatedAt: Timestamp.now(),
        });
      });

      // Unassign all documents
      documents.forEach((document) => {
        const ref = doc(db, 'documents', document.id);
        batch.update(ref, {
          courseId: null,
          updatedAt: Timestamp.now(),
        });
      });

      await batch.commit();
    } catch (err) {
      console.error(
        'CourseService: Error unassigning all items from course',
        err
      );
      throw err;
    }
  }
}

export default new CourseService();
