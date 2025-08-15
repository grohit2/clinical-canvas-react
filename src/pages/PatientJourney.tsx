import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import api from "@/lib/api";
import type { Patient, TimelineEntry } from "@/types/api";

export default function PatientJourney() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getStateColors = (state: string) => {
    switch (state.toLowerCase()) {
      case 'onboarding':
        return {
          bg: 'bg-indigo-50',
          border: 'border-indigo-200',
          title: 'text-indigo-800',
          text: 'text-indigo-700',
          tag: 'bg-indigo-100 text-indigo-800'
        };
      case 'preop':
      case 'pre-op':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          title: 'text-emerald-800',
          text: 'text-emerald-700',
          tag: 'bg-emerald-100 text-emerald-800'
        };
      case 'op':
      case 'surgery':
      case 'operative':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          title: 'text-orange-800',
          text: 'text-orange-700',
          tag: 'bg-orange-100 text-orange-800'
        };
      case 'postop':
      case 'post-op':
      case 'recovery':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          title: 'text-purple-800',
          text: 'text-purple-700',
          tag: 'bg-purple-100 text-purple-800'
        };
      case 'discharge':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          title: 'text-rose-800',
          text: 'text-rose-700',
          tag: 'bg-rose-100 text-rose-800'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          title: 'text-gray-800',
          text: 'text-gray-600',
          tag: 'bg-gray-100 text-gray-800'
        };
    }
  };

  useEffect(() => {
    if (!id) return;
    api.patients
      .get(id)
      .then((data) => {
        setPatient(data);
        return api.patients.timeline(id);
      })
      .then(setTimeline)
      .catch(() => navigate("/patients"));
  }, [id, navigate]);

  if (!patient) {
    return (
      <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
        <Header
          title="Patient Journey"
          showBack
          onBack={() => navigate(`/patients/${id}`)}
          notificationCount={2}
        />
        <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20 max-w-md mx-auto bg-white">
      <Header
        title="Patient Journey"
        showBack
        onBack={() => navigate(`/patients/${id}`)}
        notificationCount={2}
      />
      
      {/* Patient Info Header */}
      <div className="bg-white p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{patient.name}</h2>
        <p className="text-sm text-gray-600">MRN: {patient.mrn}</p>
      </div>

      {/* Timeline */}
      <div className="p-4">
        {timeline.length > 0 ? (
          <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-xl font-medium text-gray-900">Patient Journey</h3>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-600">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              </div>
              
              <div className="space-y-4">
                {timeline.map((entry, index) => {
                  const colors = getStateColors(entry.state);
                  const date = new Date(entry.dateIn);
                  
                  return (
                    <div key={entry.timelineId} className="flex items-start">
                      {/* Date column */}
                      <div className="flex flex-col items-center mr-4">
                        <div className="w-10 text-center">
                          <p className="text-sm font-medium text-gray-600">{date.getDate()}</p>
                          <p className="text-xs text-gray-400">{date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</p>
                        </div>
                        {index < timeline.length - 1 && (
                          <div className="w-px h-full bg-gray-300 mt-1"></div>
                        )}
                      </div>
                      
                      {/* Timeline content */}
                      <div className={`border rounded-lg p-3 flex-1 ${colors.bg} ${colors.border}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h2 className={`font-medium ${colors.title} capitalize`}>
                              {entry.state}
                            </h2>
                            <p className={`text-sm ${colors.text} mt-1`}>
                              {entry.notes ? entry.notes : `${entry.state === 'onboarding' ? 'Patient added to the system.' : 
                              entry.state === 'preop' || entry.state === 'pre-op' ? 'Moved to pre-operative stage.' :
                              entry.state === 'op' || entry.state === 'surgery' ? 'Patient in operating room.' :
                              entry.state === 'postop' || entry.state === 'post-op' ? 'Patient in recovery.' :
                              entry.state === 'discharge' ? 'Patient ready for discharge.' :
                              `Entered ${entry.state} stage`}`}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600">{formatTime(entry.dateIn)}</p>
                        </div>
                        
                        {/* Tags for required items */}
                        {entry.requiredIn.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {entry.requiredIn.map((requirement, reqIndex) => (
                              <span key={reqIndex} className={`text-xs px-2 py-1 rounded-full ${colors.tag}`}>
                                {requirement}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Actor info */}
                        {entry.actorId && (
                          <p className="text-xs text-gray-600 mt-2">By {entry.actorId}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            <p>No timeline data available for this patient</p>
          </div>
        )}
      </div>

      <BottomBar />
    </div>
  );
}