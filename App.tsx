import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, orderBy, limit, type Unsubscribe, setDoc } from '@firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Menu, LogOut, Camera } from 'lucide-react';

import { auth, db, appId, storage } from './services/firebase';
import { translations, subjectDisplayTranslations, defaultHomeLayout } from './constants';
import type { AppUser, FileData, CalendarEvent, ModalContent } from './types';

import CustomModal from './components/ui/Modal';
import AuthView from './components/views/AuthView';
import HomeView from './components/views/HomeView';
import SubjectView from './components/views/SubjectView';
import CalendarView from './components/views/CalendarView';
import SettingsView from './components/views/SettingsView';
import InfoView from './components/views/InfoView';
import FaqView from './components/views/FaqView';
import ToolsView from './components/views/ToolsView';
import Sidebar from './components/ui/Sidebar';
import OfflineIndicator from './components/ui/OfflineIndicator';
import NotesView from './components/views/tools/NotesView';
import TutorialView from './components/views/TutorialView';


type AppStatus = 'initializing' | 'unauthenticated' | 'authenticated';

// --- Loading Screen Component ---
const LoadingScreen: React.FC<{ getThemeClasses: (variant: string) => string }> = ({ getThemeClasses }) => (
    <div className={`fixed inset-0 flex flex-col items-center justify-center ${getThemeClasses('bg')} z-50`}>
       <img src="https://i.imgur.com/n5jikg9.png" alt="Schoolmaps Logo" className="h-auto mb-8" style={{ maxWidth: '180px' }} />
       <div role="status" aria-label="Loading application">
          <svg aria-hidden="true" className="w-10 h-10 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="rgba(255,255,255,0.3)"/>
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0492C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
          </svg>
       </div>
   </div>
);


// --- Main App Layout for Authenticated Users (Now largely stateless) ---
const MainAppLayout: React.FC<{
    user: AppUser;
    t: (key: string, replacements?: any) => string;
    tSubject: (subjectKey: string) => string;
    getThemeClasses: (variant: string) => string;
    showAppModal: (content: ModalContent) => void;
    closeAppModal: () => void;
    copyTextToClipboard: (text: string, title?: string) => boolean;
    setIsProfilePicModalOpen: (isOpen: boolean) => void;
    handleLogout: () => void;
    // Navigation state and handlers
    currentView: string;
    setCurrentView: (view: string) => void;
    currentSubject: string | null;
    setCurrentSubject: (subject: string | null) => void;
    handleGoHome: () => void;
    // Data for views
    subjectFiles: FileData[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    userEvents: CalendarEvent[];
    recentFiles: FileData[];
    // Props for SettingsView
    language: 'nl' | 'en';
    setLanguage: (lang: 'nl' | 'en') => void;
    themeColor: string;
    setThemeColor: (color: string) => void;
    onProfileUpdate: (updatedData: Partial<AppUser>) => Promise<void>;

}> = ({
    user, t, tSubject, getThemeClasses, showAppModal, copyTextToClipboard, setIsProfilePicModalOpen,
    handleLogout, currentView, setCurrentView, currentSubject, setCurrentSubject, handleGoHome,
    subjectFiles, searchQuery, setSearchQuery, userEvents, recentFiles,
    language, setLanguage, themeColor, setThemeColor, onProfileUpdate, closeAppModal
}) => {
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Sidebar Click-outside Handler remains here as it's UI-specific to the layout
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && isSidebarOpen) {
                 const hamburgerButton = document.getElementById('hamburger-menu');
                 if(hamburgerButton && !hamburgerButton.contains(event.target as Node)) {
                    setIsSidebarOpen(false);
                 }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSidebarOpen]);

    const mainContent = (
        <div className="animate-fade-in">
            {currentView === 'home' && !currentSubject && <HomeView {...{ user, setCurrentView, t, getThemeClasses, tSubject, setCurrentSubject, recentFiles, userEvents, language }} />}
            {currentView === 'home' && currentSubject && <SubjectView {...{ user, currentSubject, subjectFiles, setCurrentSubject, t, tSubject, getThemeClasses, showAppModal, userId: user.uid, searchQuery, setSearchQuery, copyTextToClipboard }} />}
            {currentView === 'calendar' && <CalendarView {...{ userEvents, t, getThemeClasses, tSubject, language, showAppModal, userId: user.uid, user }} />}
            {currentView === 'notes' && <NotesView {...{ userId: user.uid, user, t, tSubject, getThemeClasses, showAppModal }} />}
            {currentView === 'tools' && <ToolsView {...{ t, getThemeClasses, showAppModal, closeAppModal, userId: user.uid, user, tSubject, copyTextToClipboard, onProfileUpdate }} />}
            {currentView === 'settings' && <SettingsView {...{ user, t, getThemeClasses, language, setLanguage, themeColor, setThemeColor, showAppModal, tSubject, setCurrentView, onProfileUpdate }} />}
            {currentView === 'appInfo' && <InfoView {...{ t, getThemeClasses, setCurrentView }} />}
            {currentView === 'faq' && <FaqView {...{ t, getThemeClasses, setCurrentView }} />}
        </div>
    );
    
    return (
        <div className={`flex h-screen w-full font-sans`}>
             <Sidebar {...{ user, isSidebarOpen, setIsSidebarOpen, sidebarRef, t, getThemeClasses, setCurrentView, currentView, currentSubject, setIsProfilePicModalOpen }} />
            <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
               <header className="p-4 sticky top-0 bg-white/80 backdrop-blur-lg z-30 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <button type="button" id="hamburger-menu" onClick={() => setIsSidebarOpen(true)} className={`p-2 rounded-lg text-white ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} transition-transform duration-200 active:scale-90`}>
                            <Menu className="w-6 h-6" />
                        </button>
                         <h1 onClick={handleGoHome} className={`text-2xl font-bold ${getThemeClasses('text-logo')} cursor-pointer transition-transform hover:scale-105 active:scale-100`}>
                            Schoolmaps
                         </h1>
                        <button type="button" onClick={handleLogout} title={t('logout_button')} className="p-2 rounded-lg text-red-500 bg-red-100 hover:bg-red-200 transition-colors duration-200 active:scale-90">
                            <LogOut className="w-6 h-6" />
                        </button>
                    </div>
               </header>
                <div className="flex-1 p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {mainContent}
                    </div>
                </div>
            </main>
        </div>
    );
};

// --- Profile Picture Upload Modal ---
const ProfilePicModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    t: (key: string) => string;
    getThemeClasses: (variant: string) => string;
    handleProfilePicUpload: (file: File) => void;
}> = ({ isOpen, onClose, t, getThemeClasses, handleProfilePicUpload }) => {
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setProfilePicFile(null);
            setPreview(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!profilePicFile) {
            setPreview(null);
            return;
        }
        const objectUrl = URL.createObjectURL(profilePicFile);
        setPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [profilePicFile]);

    if (!isOpen) return null;

    const onUpload = () => {
        if (profilePicFile) {
            handleProfilePicUpload(profilePicFile);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full transform transition-all duration-300 scale-100 animate-scale-up" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">{t('profile_picture_upload_label')}</h3>
                {preview && <img src={preview} alt="Preview" className="w-32 h-32 rounded-full mx-auto mb-4 object-cover" />}
                <input type="file" accept="image/*" onChange={e => setProfilePicFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100" />
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold transition-colors active:scale-95">{t('cancel_button')}</button>
                    <button onClick={onUpload} disabled={!profilePicFile} className={`py-2 px-4 rounded-lg text-white font-bold ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} disabled:opacity-50 transition-colors active:scale-95`}>{t('upload_profile_picture_button')}</button>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    // Top-level app state
    const [user, setUser] = useState<AppUser | null>(null);
    const [appStatus, setAppStatus] = useState<AppStatus>('initializing');
    const [modalContent, setModalContent] = useState<ModalContent | null>(null);
    const [themeColor, setThemeColor] = useState(localStorage.getItem('themeColor') || 'emerald');
    const [language, setLanguage] = useState<'nl' | 'en'>((localStorage.getItem('appLanguage') as 'nl' | 'en') || 'nl');
    const [isProfilePicModalOpen, setIsProfilePicModalOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    
    // Lifted state from MainAppLayout
    const [currentView, setCurrentView] = useState('home');
    const [currentSubject, setCurrentSubject] = useState<string | null>(null);
    const [allSubjectFiles, setAllSubjectFiles] = useState<FileData[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [userEvents, setUserEvents] = useState<CalendarEvent[]>([]);
    const [recentFiles, setRecentFiles] = useState<FileData[]>([]);

    // Memoized theme and translation functions
    const getThemeClasses = useCallback((variant: string): string => {
        const themeStyles: { [color: string]: { [variant: string]: string } } = {
            emerald: { bg: 'bg-emerald-500', 'hover-bg': 'hover:bg-emerald-600', text: 'text-emerald-700', 'text-strong': 'text-emerald-800', border: 'border-emerald-500', ring: 'focus:ring-emerald-500', 'bg-light': 'bg-emerald-50', 'border-light': 'border-emerald-100', 'text-logo': 'text-emerald-600' },
            blue: { bg: 'bg-blue-500', 'hover-bg': 'hover:bg-blue-600', text: 'text-blue-700', 'text-strong': 'text-blue-800', border: 'border-blue-500', ring: 'focus:ring-blue-500', 'bg-light': 'bg-blue-50', 'border-light': 'border-blue-100', 'text-logo': 'text-blue-600' },
            rose: { bg: 'bg-rose-500', 'hover-bg': 'hover:bg-rose-600', text: 'text-rose-700', 'text-strong': 'text-rose-800', border: 'border-rose-500', ring: 'focus:ring-rose-500', 'bg-light': 'bg-rose-50', 'border-light': 'border-rose-100', 'text-logo': 'text-rose-600' },
            purple: { bg: 'bg-purple-500', 'hover-bg': 'hover:bg-purple-600', text: 'text-purple-700', 'text-strong': 'text-purple-800', border: 'border-purple-500', ring: 'focus:ring-purple-500', 'bg-light': 'bg-purple-50', 'border-light': 'border-purple-100', 'text-logo': 'text-purple-600' },
            pink: { bg: 'bg-pink-500', 'hover-bg': 'hover:bg-pink-600', text: 'text-pink-700', 'text-strong': 'text-pink-800', border: 'border-pink-500', ring: 'focus:ring-pink-500', 'bg-light': 'bg-pink-50', 'border-light': 'border-pink-100', 'text-logo': 'text-pink-600' },
            indigo: { bg: 'bg-indigo-500', 'hover-bg': 'hover:bg-indigo-600', text: 'text-indigo-700', 'text-strong': 'text-indigo-800', border: 'border-indigo-500', ring: 'focus:ring-indigo-500', 'bg-light': 'bg-indigo-50', 'border-light': 'border-indigo-100', 'text-logo': 'text-indigo-600' },
            teal: { bg: 'bg-teal-500', 'hover-bg': 'hover:bg-teal-600', text: 'text-teal-700', 'text-strong': 'text-teal-800', border: 'border-teal-500', ring: 'focus:ring-teal-500', 'bg-light': 'bg-teal-50', 'border-light': 'border-teal-100', 'text-logo': 'text-teal-600' },
            amber: { bg: 'bg-amber-500', 'hover-bg': 'hover:bg-amber-600', text: 'text-amber-700', 'text-strong': 'text-amber-800', border: 'border-amber-500', ring: 'focus:ring-amber-500', 'bg-light': 'bg-amber-50', 'border-light': 'border-amber-100', 'text-logo': 'text-amber-600' }
        };
        return (themeStyles[themeColor]?.[variant]) || themeStyles['emerald'][variant] || '';
    }, [themeColor]);

    const t = useCallback((key: string, replacements: { [key: string]: string | number } = {}): string => {
        const lang = language as keyof typeof translations;
        let text = translations[lang]?.[key] || translations.nl[key] || key;
        for (const placeholder in replacements) {
            text = text.replace(`{${placeholder}}`, String(replacements[placeholder]));
        }
        return text;
    }, [language]);

    const tSubject = useCallback((subjectKey: string): string => {
        const lang = language as keyof typeof subjectDisplayTranslations;
        return subjectDisplayTranslations[lang]?.[subjectKey] || subjectKey.charAt(0).toUpperCase() + subjectKey.slice(1).replace(/_/g, ' ');
    }, [language]);

    const showAppModal = useCallback((content: ModalContent) => setModalContent(content), []);
    const closeAppModal = useCallback(() => setModalContent(null), []);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            showAppModal({ text: t('app_back_online_message') });
        };
        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [t, showAppModal]);
    
    const handleLogout = useCallback(() => {
        showAppModal({
            text: t('confirm_logout'),
            confirmAction: async () => {
                sessionStorage.setItem('logout-event', 'true');
                await signOut(auth);
            },
            cancelAction: () => {}
        });
    }, [showAppModal, t]);

    const handleGoHome = useCallback(() => {
        setCurrentView('home');
        setCurrentSubject(null);
    }, []);

    // Data fetching effects, now at top level
    useEffect(() => {
        if (!user?.uid || user.uid === 'guest-user') {
            setUserEvents([]);
            setRecentFiles([]);
            return;
        }

        const eventsQuery = query(collection(db, `artifacts/${appId}/users/${user.uid}/calendarEvents`), orderBy('start', 'asc'));
        const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
            setUserEvents(fetchedEvents);
        }, (error) => {
            console.error("Error fetching calendar events:", error);
        });

        const filesQuery = query(collection(db, `artifacts/${appId}/public/data/files`), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'), limit(5));
        const unsubscribeFiles = onSnapshot(filesQuery, (snapshot) => {
            const fetchedFiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileData));
            setRecentFiles(fetchedFiles);
        }, (error) => {
            console.error("Error fetching recent files:", error);
        });
        
        return () => {
            unsubscribeEvents();
            unsubscribeFiles();
        };

    }, [user?.uid]);
    
    useEffect(() => {
        if (!user?.uid || !currentSubject || user.uid === 'guest-user') {
            setAllSubjectFiles([]);
            return;
        }

        const filesQuery = query(
          collection(db, `artifacts/${appId}/public/data/files`),
          where('ownerId', '==', user.uid),
          where('subject', '==', currentSubject),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(filesQuery, (snapshot) => {
            const fetchedFiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileData));
            setAllSubjectFiles(fetchedFiles);
        }, (error) => {
             console.error(`Error fetching files for subject ${currentSubject}:`, error);
        });

        return () => unsubscribe();
    }, [user?.uid, currentSubject]);
    
    const subjectFiles = useMemo(() => {
        if (searchQuery.trim() === '') return allSubjectFiles;
        const lowerCaseQuery = searchQuery.toLowerCase();
        return allSubjectFiles.filter(file => 
            file.title.toLowerCase().includes(lowerCaseQuery) ||
            (file.description && file.description.toLowerCase().includes(lowerCaseQuery))
        );
    }, [allSubjectFiles, searchQuery]);
    
    const handleProfileUpdate = useCallback(async (updatedData: Partial<AppUser>) => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        
        // Optimistic update
        setUser(currentUser => currentUser ? { ...currentUser, ...updatedData } : null);

        try {
            const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, uid);
            await setDoc(userDocRef, updatedData, { merge: true });
        } catch (error) {
            // Revert on failure by re-fetching user data
             const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, uid);
             onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                   setUser(currentUser => currentUser ? { ...currentUser, ...docSnap.data()} : null);
                }
             });
            showAppModal({ text: t('error_save_settings_failed') });
            console.error("Error saving profile:", error);
        }
    }, [showAppModal, t]);

    const handleProfilePicUpload = useCallback(async (file: File) => {
        if (!user || user.uid === 'guest-user') {
             showAppModal({ text: t('error_guest_action_not_allowed') });
            return;
        };
        try {
            const filePath = `profilePictures/${user.uid}/${file.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await setDoc(doc(db, `artifacts/${appId}/public/data/users`, user.uid), { profilePictureUrl: url }, { merge: true });
            showAppModal({ text: t('profile_picture_upload_success') });
        } catch (error) {
            showAppModal({ text: t('error_profile_pic_upload_failed') });
        }
    }, [user, showAppModal, t]);

    const handleTutorialFinished = useCallback(() => {
        setIsTutorialOpen(false);
        if (user) {
            handleProfileUpdate({ hasCompletedTutorial: true });
        }
    }, [user, handleProfileUpdate]);
    
    // Main authentication and profile loading effect
    useEffect(() => {
        let profileUnsubscribe: Unsubscribe | undefined;

        const authSubscriber = onAuthStateChanged(auth, (firebaseUser) => {
            if (profileUnsubscribe) profileUnsubscribe();

            const finishLoading = (status: AppStatus) => {
                 setTimeout(() => {
                    setAppStatus(status);
                }, 1500); // Ensure loading screen is visible for a minimum duration
            };

            if (firebaseUser) {
                const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, firebaseUser.uid);
                profileUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
                    let finalUser: AppUser;
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        
                        finalUser = {
                            uid: firebaseUser.uid,
                            email: userData.email || firebaseUser.email || '',
                            userName: userData.userName || 'Gebruiker',
                            profilePictureUrl: userData.profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.userName || 'S')}&background=random&color=fff`,
                            createdAt: userData.createdAt || new Date(),
                            selectedSubjects: userData.selectedSubjects || [],
                            customSubjects: userData.customSubjects || [],
                            schoolName: userData.schoolName || '',
                            className: userData.className || '',
                            educationLevel: userData.educationLevel || '',
                            languagePreference: userData.languagePreference || 'nl',
                            themePreference: userData.themePreference || 'emerald',
                            homeLayout: userData.homeLayout || defaultHomeLayout,
                            hasCompletedTutorial: userData.hasCompletedTutorial || false,
                        };
                    } else {
                        finalUser = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            userName: firebaseUser.displayName || t('guest_fallback_name'),
                            profilePictureUrl: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || 'S')}&background=random&color=fff`,
                            createdAt: new Date(),
                            selectedSubjects: [],
                            customSubjects: [],
                            schoolName: '',
                            className: '',
                            educationLevel: '',
                            languagePreference: (localStorage.getItem('appLanguage') as 'nl' | 'en') || 'nl',
                            themePreference: localStorage.getItem('themeColor') || 'emerald',
                            homeLayout: defaultHomeLayout,
                            hasCompletedTutorial: false,
                        };
                    }
                    setUser(finalUser);
                    finishLoading('authenticated');
                }, (error) => {
                    console.error("Firestore profile snapshot error:", error);
                    showAppModal({ text: t('error_profile_load_failed') });
                    finishLoading('unauthenticated');
                });
            } else {
                setUser(null);
                if (sessionStorage.getItem('logout-event') === 'true') {
                    showAppModal({ text: t('success_logout') });
                    sessionStorage.removeItem('logout-event');
                }
                finishLoading('unauthenticated');
            }
        });

        return () => {
            authSubscriber();
            if (profileUnsubscribe) profileUnsubscribe();
        };
    }, [showAppModal, t]);

    // Effect to sync user preferences to app state and handle tutorial
    useEffect(() => {
        if (user) {
            if (user.themePreference && user.themePreference !== themeColor) {
                setThemeColor(user.themePreference);
            }
            if (user.languagePreference && user.languagePreference !== language) {
                setLanguage(user.languagePreference);
            }
            if (!user.hasCompletedTutorial && sessionStorage.getItem('justRegistered') === 'true') {
                sessionStorage.removeItem('justRegistered');
                setIsTutorialOpen(true);
            }
        }
    }, [user, themeColor, language, showAppModal, handleProfileUpdate, t]);

    const copyTextToClipboard = useCallback((text: string, title: string = '') => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                 showAppModal({ text: t('share_link_copied', { title }) });
            }).catch(() => {
                 showAppModal({ text: t('error_copy_share_link') });
            });
            return true;
        }
        return false;
    }, [showAppModal, t]);
    
    return (
        <div className={`min-h-screen font-sans antialiased ${appStatus !== 'authenticated' ? getThemeClasses('bg') : ''}`}>
             <style>{`
                 @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                 @keyframes fadeInSlower { from { opacity: 0; } to { opacity: 1; } }
                 .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
                 .animate-fade-in-slow { animation: fadeInSlower 0.5s ease-out forwards; }
             `}</style>
            {modalContent && <CustomModal {...{ ...modalContent, onClose: closeAppModal, t, getThemeClasses }} />}
            
            {appStatus === 'initializing' && <LoadingScreen getThemeClasses={getThemeClasses} />}
            
            {appStatus === 'unauthenticated' && <AuthView {...{ showAppModal, t, getThemeClasses, tSubject }} />}
            
            {appStatus === 'authenticated' && user && (
                <>
                    <MainAppLayout {...{ user, t, getThemeClasses, showAppModal, closeAppModal, tSubject, copyTextToClipboard, setIsProfilePicModalOpen, language, setLanguage, themeColor, setThemeColor, handleLogout, handleGoHome, currentView, setCurrentView, currentSubject, setCurrentSubject, subjectFiles, searchQuery, setSearchQuery, userEvents, recentFiles, onProfileUpdate: handleProfileUpdate }} />
                    <ProfilePicModal 
                        isOpen={isProfilePicModalOpen} 
                        onClose={() => setIsProfilePicModalOpen(false)}
                        t={t}
                        getThemeClasses={getThemeClasses}
                        handleProfilePicUpload={handleProfilePicUpload}
                    />
                    <TutorialView 
                        isOpen={isTutorialOpen} 
                        onFinish={handleTutorialFinished}
                        t={t}
                        getThemeClasses={getThemeClasses}
                        userName={user.userName}
                    />
                </>
            )}
            <OfflineIndicator isOnline={isOnline} t={t} />
        </div>
    );
};

export default App;
