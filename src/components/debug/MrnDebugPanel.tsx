import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import api from '@/lib/api';

interface MrnDebugPanelProps {
  patientId: string;
}

export function MrnDebugPanel({ patientId }: MrnDebugPanelProps) {
  const [testMrn, setTestMrn] = useState('TEST-' + Math.random().toString(36).substr(2, 6));
  const [testScheme, setTestScheme] = useState('ASP');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const testMrnUpdate = async () => {
    console.log('🧪 DEBUG: Testing MRN Update');
    console.log('Patient ID:', patientId);
    
    setIsLoading(true);
    setLastResponse(null);

    try {
      // Get current patient data first
      const currentPatient = await api.patients.get(patientId);
      console.log('📋 Current Patient Data:', currentPatient);

      // Create new MRN history entry
      const newMrnEntry = {
        mrn: testMrn,
        scheme: testScheme,
        date: new Date().toISOString()
      };

      const updatedHistory = [...(currentPatient.mrnHistory || []), newMrnEntry];
      
      // Test the update
      const updatePayload = {
        mrnHistory: updatedHistory,
        latestMrn: testMrn
      };

      console.log('🚀 Update Payload:', updatePayload);
      
      const response = await api.patients.update(patientId, updatePayload);
      
      console.log('✅ Update Response:', response);
      setLastResponse(response);
      
      // Verify the update worked
      const verifyPatient = await api.patients.get(patientId);
      console.log('🔍 Verification - Updated Patient:', verifyPatient);
      
    } catch (error) {
      console.error('❌ Test Failed:', error);
      setLastResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4 m-4 border-orange-200 bg-orange-50">
      <h3 className="text-lg font-bold text-orange-800 mb-4">🧪 MRN Debug Panel</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Test MRN:</label>
            <Input
              value={testMrn}
              onChange={(e) => setTestMrn(e.target.value)}
              placeholder="TEST-123456"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Test Scheme:</label>
            <Input
              value={testScheme}
              onChange={(e) => setTestScheme(e.target.value)}
              placeholder="ASP"
            />
          </div>
        </div>
        
        <Button 
          onClick={testMrnUpdate}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testing...' : 'Test MRN Update API'}
        </Button>
        
        {lastResponse && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Last Response:</h4>
            <pre className="bg-white p-2 rounded border text-xs overflow-auto max-h-40">
              {JSON.stringify(lastResponse, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="text-xs text-orange-600">
          <strong>Note:</strong> Check browser console for detailed API call logs
        </div>
      </div>
    </Card>
  );
}