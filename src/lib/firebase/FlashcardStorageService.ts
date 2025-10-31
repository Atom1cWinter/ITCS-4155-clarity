import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export interface FlashcardDeck {
  id?: string;
  userId: string;
  title: string;
  cards: Array<{ front: string; back: string }>;
  numCards: number;
  style: string;
  createdAt: Date;
  updatedAt: Date;
}

class FlashcardStorageService {
  private collectionName = 'flashcardDecks';

  async saveDeck(deck: Omit<FlashcardDeck, 'id'>): Promise<string> {
    try {
      try {
        const docRef = await addDoc(collection(db, this.collectionName), {
          ...deck,
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt,
        });
        return docRef.id;
      } catch (err) {
        // Some projects lock down top-level collections but allow writes to user-scoped subcollections.
        // Try a fallback path users/{userId}/flashcardDecks
        console.warn('Primary save failed, attempting fallback user-scoped save:', err);
        try {
          const userCollection = collection(db, 'users', deck.userId, this.collectionName);
          const docRef = await addDoc(userCollection, {
            ...deck,
            createdAt: deck.createdAt,
            updatedAt: deck.updatedAt,
          });
          return docRef.id;
        } catch (err2) {
          console.error('Fallback save also failed:', err2);
          throw err2;
        }
      }
    } catch (error) {
      console.error('Error saving flashcard deck:', error);
      throw error;
    }
  }

  async getUserDecks(userId: string): Promise<FlashcardDeck[]> {
    try {
      const q = query(collection(db, this.collectionName), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const decks: FlashcardDeck[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        decks.push({
          id: doc.id,
          userId: data.userId,
          title: data.title,
          cards: data.cards || [],
          numCards: data.numCards || (data.cards || []).length,
          style: data.style || 'short',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        });
      });
      // sort newest first
      decks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return decks;
    } catch (error) {
      console.error('Error fetching user flashcard decks:', error);
      throw error;
    }
  }
}

export default new FlashcardStorageService();
