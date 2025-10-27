import { useState } from 'react';
import TextSummaryService from '../lib/openai/TextSummaryService';

export default function SimpleTest() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testSimpleAPI = async () => {
    setLoading(true);
    setError('');
    setResult('');

    try {
      console.log('Starting simple API test...');
      const response = await TextSummaryService.summarizeText('This is a simple test. Machine learning is awesome. Please summarize this short text.');
      console.log('Simple test successful:', response);
      setResult(response);
    } catch (err) {
      console.error('Test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
      <h3 className="text-yellow-200 font-semibold mb-2">Simple API Test</h3>
      <button
        onClick={testSimpleAPI}
        disabled={loading}
        className="px-4 py-2 bg-yellow-500 text-black rounded mb-2 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Simple Text Summary'}
      </button>
      
      {error && (
        <div className="text-red-200 text-sm mb-2 p-2 bg-red-500/20 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {result && (
        <div className="text-green-200 text-sm p-2 bg-green-500/20 rounded">
          <strong>Success:</strong> {result.substring(0, 200)}...
        </div>
      )}
    </div>
  );
}