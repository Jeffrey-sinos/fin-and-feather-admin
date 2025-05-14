
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to admin dashboard
    navigate('/admin');
  }, [navigate]);

  // Fallback UI while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Lake Victoria Aquaculture</h1>
        <p className="text-xl text-gray-600">Redirecting to the admin dashboard...</p>
        <div className="mt-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      </div>
    </div>
  );
};

export default Index;
