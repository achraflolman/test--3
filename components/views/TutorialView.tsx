
import React, { useState } from 'react';
import { Book, Calendar, BrainCircuit, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface TutorialViewProps {
    isOpen: boolean;
    onFinish: () => void;
    t: (key: string, replacements?: { [key: string]: string | number }) => string;
    getThemeClasses: (variant: string) => string;
    userName: string;
}

const TutorialView: React.FC<TutorialViewProps> = ({ isOpen, onFinish, t, getThemeClasses, userName }) => {
    const [step, setStep] = useState(0);

    const tutorialSteps = [
        {
            icon: <img src="https://i.imgur.com/n5jikg9.png" alt="Schoolmaps Logo" className="h-16 w-auto mx-auto"/>,
            title: t('tutorial_welcome_title', { userName }),
            text: t('tutorial_welcome_text'),
        },
        {
            icon: <Book className="w-12 h-12" />,
            title: t('tutorial_step1_title'),
            text: t('tutorial_step1_text'),
        },
        {
            icon: <Calendar className="w-12 h-12" />,
            title: t('tutorial_step2_title'),
            text: t('tutorial_step2_text'),
        },
        {
            icon: <BrainCircuit className="w-12 h-12" />,
            title: t('tutorial_step3_title'),
            text: t('tutorial_step3_text'),
        },
        {
            icon: <CheckCircle className="w-12 h-12" />,
            title: t('tutorial_step4_title'),
            text: t('tutorial_step4_text'),
        },
    ];

    const currentStep = tutorialSteps[step];

    if (!isOpen) return null;

    const nextStep = () => {
        if (step < tutorialSteps.length - 1) {
            setStep(s => s + 1);
        } else {
            onFinish();
        }
    };
    
    const prevStep = () => {
        if (step > 0) {
            setStep(s => s - 1);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[100] animate-fade-in-slow">
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full transform transition-all duration-300 scale-100 animate-scale-up text-center flex flex-col justify-between" style={{ minHeight: '380px'}}>
                <div>
                    <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center -mt-20 mb-4 ${getThemeClasses('bg-light')}`}>
                        <div className={getThemeClasses('text')}>
                            {currentStep.icon}
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{currentStep.title}</h3>
                    <p className="text-gray-600 mb-6">{currentStep.text}</p>
                </div>

                <div>
                    <div className="flex justify-center items-center space-x-2 mb-6">
                        {tutorialSteps.map((_, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === step ? getThemeClasses('bg') : 'bg-gray-300'}`}></div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between">
                        {step > 0 ? (
                           <button onClick={prevStep} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold transition-colors active:scale-95 flex items-center gap-2">
                               <ArrowLeft size={16}/> {t('back_button')}
                           </button>
                        ) : (
                           <button onClick={onFinish} className="py-2 px-4 rounded-lg bg-transparent text-gray-500 hover:bg-gray-100 font-semibold transition-colors active:scale-95">
                               {t('skip_tutorial')}
                           </button>
                        )}

                        <button onClick={nextStep} className={`py-2 px-4 rounded-lg text-white font-bold ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} transition-colors active:scale-95 flex items-center gap-2`}>
                            {step === tutorialSteps.length - 1 ? t('finish_tutorial') : t('next_button')}
                            {step < tutorialSteps.length - 1 && <ArrowRight size={16}/>}
                        </button>
                    </div>
                </div>
            </div>
             <style>{`
                @keyframes scaleUp { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                .animate-scale-up { animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
             `}</style>
        </div>
    );
};

export default TutorialView;
