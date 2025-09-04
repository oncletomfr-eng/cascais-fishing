'use client';

export default function TestDeploymentCheck() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🚀 Deployment Check</h1>
      <p className="text-lg mb-4">
        Test page created at: {new Date().toISOString()}
      </p>
      <div className="bg-green-100 border border-green-400 rounded p-4">
        <h2 className="text-xl font-semibold text-green-800">✅ Deployment Working!</h2>
        <p className="text-green-700">
          If you can see this page, deployment process is functioning correctly.
        </p>
      </div>
    </div>
  );
}
