import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Document {
  id?: string;
  userId: string;
  fileName: string;
  fileHash: string;
  fileSize: number;
  fileType: string;
  uploadedAt: Date;
  updatedAt: Date;
}

class DocumentService {
  private collectionName = 'documents';

  /**
   * Save a document to Firestore
   */
  async uploadDocument(document: Omit<Document, 'id'>): Promise<string> {
    try {
      console.log('Uploading document:', document.fileName, 'for user:', document.userId);
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...document,
        uploadedAt: document.uploadedAt,
        updatedAt: document.updatedAt,
      });
      console.log('Document uploaded successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Get all documents for a user
   */
  async getUserDocuments(userId: string): Promise<Document[]> {
    try {
      console.log('Fetching documents for user:', userId);
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      console.log('Found', querySnapshot.size, 'documents for user:', userId);
      const documents: Document[] = [];
      
      querySnapshot.forEach((doc) => {
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
      
      // Sort by uploadedAt descending (newest first)
      documents.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
      
      console.log('Loaded documents:', documents.length);
      return documents;
    } catch (error) {
      console.error('Error getting user documents:', error);
      throw error;
    }
  }

  /**
   * Get a specific document by ID
   */
  async getDocumentById(documentId: string): Promise<Document | null> {
    try {
      const docRef = doc(db, this.collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      const uploadedAt = data.uploadedAt?.toDate ? data.uploadedAt.toDate() : new Date(data.uploadedAt);
      const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
      
      return {
        id: docSnap.id,
        userId: data.userId,
        fileName: data.fileName,
        fileHash: data.fileHash,
        fileSize: data.fileSize,
        fileType: data.fileType,
        uploadedAt,
        updatedAt,
      };
    } catch (error) {
      console.error('Error getting document by ID:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, documentId);
      await deleteDoc(docRef);
      console.log('Document deleted:', documentId);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get document by file hash (to detect duplicates)
   */
  async getDocumentByFileHash(userId: string, fileHash: string): Promise<Document | null> {
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
      const uploadedAt = data.uploadedAt?.toDate ? data.uploadedAt.toDate() : new Date(data.uploadedAt);
      const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
      
      return {
        id: doc.id,
        userId: data.userId,
        fileName: data.fileName,
        fileHash: data.fileHash,
        fileSize: data.fileSize,
        fileType: data.fileType,
        uploadedAt,
        updatedAt,
      };
    } catch (error) {
      console.error('Error getting document by file hash:', error);
      throw error;
    }
  }
}

export default new DocumentService();
