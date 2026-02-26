import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, ArrowRight, ArrowLeft, User, MessageSquare, Image, Globe, Mic } from 'lucide-react';

const TutorialOverlay: React.FC = () => {
  const { showTutorial, setShowTutorial } = useApp();
  const [step, setStep] = useState(0);

  if (!showTutorial) return null;

  const steps = [
    {
      title: "Welcome to AI Companion",
      content: "Your personal, customizable AI assistant. Let's explore what you can do!",
      icon: <User className="w-12 h-12 text-indigo-600" />,
    },
    {
      title: "Customize Your Persona",
      content: "Go to the 'AI Profile' screen to change your AI's name, personality, voice, and appearance. You can create multiple personas for different moods or tasks.",
      icon: <User className="w-12 h-12 text-indigo-600" />,
    },
    {
      title: "Multi-Modal Chat",
      content: "In the Chat screen, you can type, speak (using the microphone), upload images for analysis, and attach PDF documents. The AI can see and hear you!",
      icon: <Mic className="w-12 h-12 text-indigo-600" />,
    },
    {
      title: "Contextual Chat Modes",
      content: (
        <div className="text-left space-y-2">
          <p>Enhance your roleplay and interactions:</p>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>Use <strong>*asterisks*</strong> for actions (e.g., <em>*smiles warmly*</em>).</li>
            <li>Use <strong>(parentheses)</strong> for Out-of-Character (OOC) comments (e.g., <em>(pause for a moment)</em>).</li>
          </ul>
        </div>
      ),
      icon: <MessageSquare className="w-12 h-12 text-indigo-600" />,
    },
    {
      title: "Browser Integrations",
      content: "Click the '...' menu in the chat header to access powerful tools like Location sharing, Camera access, Notifications, and File downloads.",
      icon: <Globe className="w-12 h-12 text-indigo-600" />,
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setShowTutorial(false);
      setStep(0);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in duration-300">
        <button 
          onClick={() => setShowTutorial(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center text-center space-y-6">
          <div className="p-4 bg-indigo-50 rounded-full">
            {steps[step].icon}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800">{steps[step].title}</h2>
          
          <div className="text-gray-600 min-h-[100px] flex items-center justify-center">
            {typeof steps[step].content === 'string' ? (
              <p>{steps[step].content}</p>
            ) : (
              steps[step].content
            )}
          </div>

          <div className="flex items-center justify-between w-full pt-4">
            <button
              onClick={handlePrev}
              disabled={step === 0}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                step === 0 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>

            <div className="flex space-x-1">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === step ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
            >
              {step === steps.length - 1 ? 'Finish' : 'Next'}
              {step < steps.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
