import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export interface QuizRecord {
  id?: string;
  userId: string;
  title: string;
  questions: Array<{ question: string; options: string[]; correctAnswer: number }>;
  numQuestions: number;
  createdAt: Date;
  updatedAt: Date;
}

class QuizStorageService {
  private collectionName = 'quizzes';

  async saveQuiz(quiz: Omit<QuizRecord, 'id'>): Promise<string> {
    try {
      try {
        const docRef = await addDoc(collection(db, this.collectionName), {
          ...quiz,
          createdAt: quiz.createdAt,
          updatedAt: quiz.updatedAt,
        });
        return docRef.id;
      } catch (err) {
        // Fallback to write under users/{userId}/quizzes if top-level is restricted
        console.warn('Primary save failed, attempting fallback user-scoped save:', err);
        try {
          const userCollection = collection(db, 'users', quiz.userId, this.collectionName);
          const docRef = await addDoc(userCollection, {
            ...quiz,
            createdAt: quiz.createdAt,
            updatedAt: quiz.updatedAt,
          });
          return docRef.id;
        } catch (err2) {
          console.error('Fallback save also failed:', err2);
          throw err2;
        }
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
      throw error;
    }
  }

  async getUserQuizzes(userId: string): Promise<QuizRecord[]> {
    try {
      const q = query(collection(db, this.collectionName), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const quizzes: QuizRecord[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        quizzes.push({
          id: doc.id,
          userId: data.userId,
          title: data.title,
          questions: data.questions || [],
          numQuestions: data.numQuestions || (data.questions || []).length,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        });
      });
      quizzes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return quizzes;
    } catch (error) {
      console.error('Error fetching user quizzes:', error);
      throw error;
    }
  }
}

export default new QuizStorageService();
