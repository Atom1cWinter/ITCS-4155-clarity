import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Summary {
  id?: string;
  userId: string;
  fileName: string;
  fileHash: string;
  fileSize: number;
  fileType: string;
  summaryText: string;
  createdAt: Date;
  updatedAt: Date;
}

class SummaryService {
  private collectionName = 'summaries';

  /**
   * Save a summary to Firestore
   */
  async saveSummary(summary: Omit<Summary, 'id'>): Promise<string> {
    try {
      console.log('Saving summary:', summary.fileName, 'for user:', summary.userId);
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...summary,
        // Firestore will handle Date objects and convert them to Timestamps automatically
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
      });
      console.log('Summary saved successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving summary:', error);
      throw error;
    }
  }

  /**
   * Get all summaries for a user
   */
  async getUserSummaries(userId: string): Promise<Summary[]> {
    try {
      console.log('Fetching summaries for user:', userId);
      // Query only by userId, don't order in Firestore to avoid index requirement
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      console.log('Found', querySnapshot.size, 'summaries for user:', userId);
      const summaries: Summary[] = [];
      
      querySnapshot.forEach((doc) => {
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
      
      // Sort by createdAt descending (newest first) in JavaScript instead of Firestore
      summaries.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      console.log('Loaded summaries:', summaries.length);
      return summaries;
    } catch (error) {
      console.error('Error getting user summaries:', error);
      throw error;
    }
  }

  /**
   * Get summary by file hash (to detect duplicates)
   */
  async getSummaryByFileHash(userId: string, fileHash: string): Promise<Summary | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('fileHash', '==', fileHash)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
      
      return {
        id: doc.id,
        userId: data.userId,
        fileName: data.fileName,
        fileHash: data.fileHash,
        fileSize: data.fileSize,
        fileType: data.fileType,
        summaryText: data.summaryText,
        createdAt,
        updatedAt,
      };
    } catch (error) {
      console.error('Error getting summary by file hash:', error);
      throw error;
    }
  }

  /**
   * Get a specific summary by ID
   */
  async getSummaryById(summaryId: string): Promise<Summary | null> {
    try {
      const docRef = doc(db, this.collectionName, summaryId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
      
      return {
        id: docSnap.id,
        userId: data.userId,
        fileName: data.fileName,
        fileHash: data.fileHash,
        fileSize: data.fileSize,
        fileType: data.fileType,
        summaryText: data.summaryText,
        createdAt,
        updatedAt,
      };
    } catch (error) {
      console.error('Error getting summary by ID:', error);
      throw error;
    }
  }

  /**
   * Update a summary
   */
  async updateSummary(summaryId: string, updates: Partial<Summary>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, summaryId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date(),
      });
      console.log('Summary updated:', summaryId);
    } catch (error) {
      console.error('Error updating summary:', error);
      throw error;
    }
  }

  /**
   * Delete a summary
   */
  async deleteSummary(summaryId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, summaryId);
      await deleteDoc(docRef);
      console.log('Summary deleted:', summaryId);
    } catch (error) {
      console.error('Error deleting summary:', error);
      throw error;
    }
  }

  /**
   * Get unique file names for a user (for the dropdown)
   */
  async getUniqueFileNames(userId: string): Promise<string[]> {
    try {
      const summaries = await this.getUserSummaries(userId);
      const uniqueFileNames = Array.from(new Set(summaries.map(s => s.fileName)));
      return uniqueFileNames;
    } catch (error) {
      console.error('Error getting unique file names:', error);
      throw error;
    }
  }

  /**
   * Get all summaries for a specific file name
   */
  async getSummariesByFileName(userId: string, fileName: string): Promise<Summary[]> {
    try {
      const summaries = await this.getUserSummaries(userId);
      return summaries.filter(s => s.fileName === fileName);
    } catch (error) {
      console.error('Error getting summaries by file name:', error);
      throw error;
    }
  }
}

export default new SummaryService();
