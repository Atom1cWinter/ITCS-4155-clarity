// Debug Info menu to help with development and troubleshooting
export default function DebugInfo() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  const testNetworkConnection = async () => {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      console.log('Network test response:', response.status, response.statusText);
    } catch (error) {
      console.error('Network test failed:', error);
    }
  };
  
  return (
    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
      <h3 className="text-red-200 font-semibold mb-2">Debug Info (Remove in production)</h3>
      <p className="text-red-200 text-sm">
        API Key loaded: {apiKey ? 'Yes' : 'No'}
      </p>
      <p className="text-red-200 text-sm">
        API Key starts with: {apiKey ? apiKey.substring(0, 10) + '...' : 'undefined'}
      </p>
      <p className="text-red-200 text-sm">
        Environment: {import.meta.env.MODE}
      </p>
      <button
        onClick={testNetworkConnection}
        className="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
      >
        Test API Connection
      </button>
    </div>
  );
}