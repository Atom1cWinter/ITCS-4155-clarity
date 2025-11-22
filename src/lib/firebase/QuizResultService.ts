import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";

export interface QuizResult {
  id: string;
  userId: string;
  title: string;
  takenAt: string;          // stored as ISO string when reading
  score: number;            // 0–100
  totalQuestions: number;
  correctQuestions: number;
  topics: string[];         // e.g. ["arrays", "sorting"]
   incorrectQuestions?: {
    question: string;
    correctAnswer: string;
    explanation?: string;
  }[];
}

// Input type for saving (no id / takenAt)
export type NewQuizResultInput = {
  title: string;
  score: number;
  totalQuestions: number;
  correctQuestions: number;
  topics: string[];
  incorrectQuestions?: {
    question: string;
    correctAnswer: string;
    explanation?: string;
  }[];
};

const COLLECTION_NAME = "quizResults";

const QuizResultService = {
  // save one quiz result
  async saveQuizResult(userId: string, data: NewQuizResultInput) {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      userId,
      ...data,
      takenAt: serverTimestamp(), // Firestore timestamp
    });

    await enforceMaxFive(userId);

    return docRef.id;
  },

  // get recent quiz results (used on Flashcards page)
  async getRecentQuizResults(
  userId: string,
  max: number = 5
): Promise<QuizResult[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    orderBy("takenAt", "desc"),
    limit(max)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as {
      userId: string;
      title: string;
      score: number;
      totalQuestions: number;
      correctQuestions: number;
      topics?: string[];
      incorrectQuestions?: {
        question: string;
        correctAnswer: string;
        explanation?: string;
      }[];
      takenAt?: import("firebase/firestore").Timestamp;
    };

    return {
      id: doc.id,
      userId: data.userId,
      title: data.title,
      score: data.score,
      totalQuestions: data.totalQuestions,
      correctQuestions: data.correctQuestions,
      topics: data.topics ?? [],
      incorrectQuestions: data.incorrectQuestions ?? [],
      takenAt: data.takenAt
        ? data.takenAt.toDate().toISOString()
        : new Date().toISOString(),
    };
  });
}
};
// enforce max 5 quiz results per user
async function enforceMaxFive(userId: string) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    orderBy("takenAt", "desc")
  );

  const snapshot = await getDocs(q);
  const docs = snapshot.docs;

  // If 5 or fewer → no cleanup needed
  if (docs.length <= 5) return;

  // Extract all docs except the newest 5
  const oldDocs = docs.slice(5);

  // Delete them
  const deletions = oldDocs.map(docRef => deleteDoc(docRef.ref));
  await Promise.all(deletions);

  console.log(`Cleaned up ${oldDocs.length} old quiz results`);
}

export default QuizResultService;