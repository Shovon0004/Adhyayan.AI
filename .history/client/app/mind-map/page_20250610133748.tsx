"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/api';
import { FloatingDock } from "@/components/ui/floating-dock";
import { WavyBackground } from "@/components/ui/wavy-background";
import { Textarea, Input, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/react";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import {
  IconHome,
  IconUsers,
  IconBrain,
  IconSettings,
  IconLogout,
  IconMap,
  IconMicrophone,
  IconMicrophoneOff,
  IconPlus,
  IconUpload,
  IconX,
  IconFileText,
  IconSquareRoundedX
} from "@tabler/icons-react";

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

export default function MindMap() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  // Form states
  const [subjectName, setSubjectName] = useState("");
  const [syllabus, setSyllabus] = useState("");  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Loading states for mind map creation
  const loadingStates = [
    { text: "Analyzing subject content..." },
    { text: "Processing syllabus structure..." },
    { text: "Creating knowledge nodes..." },
    { text: "Building connections..." },
    { text: "Generating visual layout..." },
    { text: "Optimizing mind map structure..." },
    { text: "Finalizing your mind map..." },
    { text: "Mind map created successfully!" }
  ];
  
  // Voice recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const speechRecognition = new (window as any).webkitSpeechRecognition();
      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;
      speechRecognition.lang = 'en-US';
      
      speechRecognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setSyllabus(prev => prev + ' ' + finalTranscript);
        }
      };
      
      speechRecognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      speechRecognition.onend = () => {
        setIsListening(false);
      };
        setRecognition(speechRecognition);
    }
  }, []);
  
  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Read file content if it's a text file
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setSyllabus(content);
        };
        reader.readAsText(file);
      }
    }
  };

  // Remove uploaded file
  const removeUploadedFile = () => {
    setUploadedFile(null);
    setSyllabus("");
  };
  
  const toggleVoiceInput = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };  const handleCreateMindMap = async () => {
    if (!subjectName.trim()) {
      alert('Please enter a subject name');
      return;
    }
    
    // Close modal immediately and start the loading process
    onOpenChange();
    setIsCreating(true);
    
    console.log('Creating mind map with dummy data:', { 
      subjectName, 
      syllabus, 
      uploadedFile: uploadedFile?.name 
    });
  };

  const handleLoaderComplete = async () => {
    try {
      // Generate a random ID for the mind map
      const mindMapId = `mindmap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create dummy mind map data and store in localStorage for demo purposes
      const dummyMindMapData = generateDummyMindMap(subjectName, syllabus);
      localStorage.setItem(`mindmap_${mindMapId}`, JSON.stringify(dummyMindMapData));
      
      // Reset form and loading state
      setSubjectName("");
      setSyllabus("");
      setUploadedFile(null);
      setIsCreating(false);
      
      // Navigate to the generated mind map view
      router.push(`/mind-map/view/${mindMapId}`);
      
    } catch (error) {
      console.error('Error creating mind map:', error);
      setIsCreating(false);
      alert(`Failed to create mind map: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Generate dummy mind map data for UI/UX design purposes
  const generateDummyMindMap = (subject: string, content: string) => {
    const topics = content ? content.split('\n').filter(line => line.trim()) : [
      'Introduction to ' + subject,
      'Fundamentals',
      'Core Concepts',
      'Advanced Topics',
      'Applications',
      'Future Trends'
    ];

    const nodes = [
      {
        id: 'root',
        label: subject,
        type: 'root',
        level: 0,
        position: { x: 400, y: 300 },
        content: `Welcome to ${subject}! This mind map will guide you through all the essential concepts and help you master this subject step by step.`,
        children: []
      }
    ];

    const edges = [];

    // Generate child nodes
    topics.slice(0, 6).forEach((topic, index) => {
      const nodeId = `node_${index + 1}`;
      nodes[0].children?.push(nodeId);
      
      nodes.push({
        id: nodeId,
        label: topic.trim() || `Topic ${index + 1}`,
        type: 'topic',
        level: 1,
        position: { x: 200 + (index % 3) * 400, y: 150 + Math.floor(index / 3) * 300 },
        content: `This section covers ${topic.trim() || `Topic ${index + 1}`}. Here you'll learn the key concepts, practical applications, and important details that will help you understand this topic thoroughly. 

Key points to remember:
• Understanding the fundamentals is crucial
• Practice with real examples
• Connect concepts to practical applications
• Review regularly for better retention

Take your time to explore this topic and use the interactive features to enhance your learning experience.`,
        parent: 'root'
      });

      edges.push({
        id: `edge_root_${nodeId}`,
        source: 'root',
        target: nodeId,
        type: 'default'
      });

      // Add subtopics for some nodes
      if (index < 3) {
        const subtopics = ['Basics', 'Advanced', 'Practice'];
        subtopics.forEach((subtopic, subIndex) => {
          const subNodeId = `${nodeId}_sub_${subIndex}`;
          nodes.push({
            id: subNodeId,
            label: `${subtopic}`,
            type: 'subtopic',
            level: 2,
            position: { x: 100 + subIndex * 150, y: 400 + index * 100 },
            content: `This is a subtopic focusing on ${subtopic} aspects of ${topic.trim() || `Topic ${index + 1}`}. 

Detailed content about ${subtopic.toLowerCase()}:
• In-depth explanation of concepts
• Step-by-step learning approach
• Practical exercises and examples
• Assessment opportunities

Use the quiz feature to test your understanding and the AI chat to ask specific questions about this subtopic.`,
            parent: nodeId
          });

          edges.push({
            id: `edge_${nodeId}_${subNodeId}`,
            source: nodeId,
            target: subNodeId,
            type: 'default'
          });
        });
      }
    });

    return {
      id: `mindmap_${Date.now()}`,
      title: subject,
      subject: subject,
      content: content,
      nodes: nodes,
      edges: edges,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.push('/');
    return null;
  }
  const dockLinks = [
    {
      title: "Home",
      icon: (
        <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/",
    },
    {
      title: "Dashboard",
      icon: (
        <IconBrain className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/dashboard",
    },
    {
      title: "Create Room",
      icon: (
        <IconUsers className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/create-room",
    },
    {
      title: "Mind Map",
      icon: (
        <IconMap className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/mind-map",
    },
    {
      title: "Settings",
      icon: (
        <IconSettings className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/settings",
    },
    {
      title: "Sign Out",
      icon: (
        <IconLogout className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: handleSignOut,
    },
  ];

  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-8 relative">        {/* Page Header */}
        <div className="text-center mb-16 z-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent mb-4">
            Mind Map Studio
          </h1>
          <p className="text-gray-400 text-lg">
            Create and manage your knowledge maps
          </p>
        </div>{/* Main Action */}
        <div className="text-center mb-16 z-10">
          <Button 
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold px-8 py-3 transform hover:scale-105 transition-all duration-300 shadow-lg"
            onPress={onOpen}
            startContent={<IconPlus className="w-5 h-5" />}
          >
            Create New Mind Map
          </Button>
        </div>        {/* Floating Dock */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <FloatingDock
            mobileClassName="translate-y-20"
            items={dockLinks}
            activeItem="/mind-map"
          />
        </div>        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
        </div>        {/* Multi-step Loader */}
        <MultiStepLoader 
          loadingStates={loadingStates} 
          loading={isCreating} 
          duration={2000} 
          loop={false} 
          onComplete={handleLoaderComplete}
        />
        
        {/* Close button for loader */}
        {isCreating && (
          <button
            className="fixed top-4 right-4 text-white dark:text-white z-[120] hover:bg-gray-800/50 rounded-lg p-2 transition-all duration-200"
            onClick={() => setIsCreating(false)}
          >
            <IconSquareRoundedX className="h-8 w-8" />
          </button>
        )}{/* Create Mind Map Modal */}
        <Modal 
          isOpen={isOpen} 
          onOpenChange={onOpenChange}
          placement="center"
          backdrop="blur"
          size="2xl"
          classNames={{
            base: "bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-700/50",
            header: "border-b border-gray-700/50 px-8 py-6",
            body: "px-8 py-8",
            footer: "border-t border-gray-700/50 px-8 py-6"
          }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-3">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">
                    Create New Mind Map 
                  </h2>
                  <p className="text-gray-400 text-base font-normal">
                    Transform your ideas into an interactive knowledge map
                  </p>
                </ModalHeader>
                
                <ModalBody>
                  <div className="space-y-8">
                    {/* Subject Name Input */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-300">
                        Subject Name *
                      </label>                      <div className="[&_*]:!outline-none [&_*]:!ring-0">
                      <Input
                        placeholder="e.g., Machine Learning, History of Art, Quantum Physics..."
                        value={subjectName}
                        onValueChange={setSubjectName}
                        variant="bordered"
                        size="lg"
                        className="!outline-none focus:!outline-none focus-within:!outline-none"
                        classNames={{
                          input: "text-white text-base bg-transparent placeholder:text-gray-500 !outline-none focus:!outline-none focus:!ring-0 focus:!border-transparent",
                          inputWrapper: "border-gray-600/50 hover:border-gray-500 data-[focus=true]:border-gray-300 data-[focus=true]:ring-2 data-[focus=true]:ring-gray-300/20 bg-gray-800/30 h-14 transition-all duration-200 !outline-none focus-within:!outline-none focus-within:!ring-0",
                          base: "!outline-none focus-within:!outline-none focus:!outline-none"
                        }}
                        style={{
                          outline: 'none !important',
                          boxShadow: 'none !important'
                        }}
                        required
                      />
                      </div>
                    </div>                    {/* Syllabus Input */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-gray-300">
                          Syllabus Content 
                        </label>
                        <div className="flex gap-2">
                          {/* File Upload Button */}
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept=".txt,.md,.doc,.docx,text/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <Button
                              as="span"
                              size="sm"
                              variant="bordered"
                              startContent={<IconUpload className="w-4 h-4" />}
                              className="border-gray-600/50 text-gray-400 hover:border-gray-500 hover:text-gray-200 bg-gray-800/20 transition-all duration-200"
                            >
                              Upload File
                            </Button>
                          </label>
                          
                          {/* Voice Input Button */}
                          <Button
                            size="sm"
                            variant="bordered"
                            onPress={toggleVoiceInput}
                            startContent={
                              isListening ? (
                                <IconMicrophoneOff className="w-4 h-4" />
                              ) : (
                                <IconMicrophone className="w-4 h-4" />
                              )
                            }
                            className={`${
                              isListening 
                                ? "bg-red-600/20 border-red-500 text-red-400 animate-pulse" 
                                : "border-gray-600/50 text-gray-400 hover:border-gray-500 hover:text-gray-200 bg-gray-800/20"
                            } transition-all duration-200`}
                          >
                            {isListening ? "Stop Recording" : "Voice Input"}
                          </Button>
                        </div>
                      </div>

                      {/* Uploaded File Display */}
                      {uploadedFile && (
                        <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <IconFileText className="w-5 h-5 text-orange-400" />
                            <div>
                              <p className="text-sm font-medium text-orange-200">{uploadedFile.name}</p>
                              <p className="text-xs text-orange-300/70">
                                {(uploadedFile.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="light"
                            onPress={removeUploadedFile}
                            className="text-orange-400 hover:text-orange-200 hover:bg-orange-500/20 min-w-unit-8 w-8 h-8 p-0"
                          >
                            <IconX className="w-4 h-4" />
                          </Button>
                        </div>
                      )}                        <div className="relative [&_*]:!outline-none [&_*]:!ring-0">
                        <Textarea
                          placeholder="Add topics, chapters, or learning objectives..You can also use voice input or upload a file."
                          value={syllabus}
                          onValueChange={setSyllabus}
                          variant="bordered"
                          minRows={6}
                          maxRows={12}
                          className="!outline-none focus:!outline-none focus-within:!outline-none"
                          classNames={{
                            input: "text-white text-sm bg-transparent placeholder:text-gray-500 resize-none !outline-none focus:!outline-none focus:!ring-0 focus:!border-transparent",
                            inputWrapper: "border-gray-600/50 hover:border-gray-500 data-[focus=true]:border-gray-300 data-[focus=true]:ring-2 data-[focus=true]:ring-gray-300/20 bg-gray-800/30 transition-all duration-200 !outline-none focus-within:!outline-none focus-within:!ring-0",
                            base: "!outline-none focus-within:!outline-none focus:!outline-none"
                          }}
                          style={{
                            outline: 'none !important',
                            boxShadow: 'none !important'
                          }}
                        />
                        </div>
                      
                      {isListening && (
                        <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-75"></span>
                            <span className="w-1 h-1 bg-orange-300 rounded-full animate-pulse delay-150"></span>
                          </div>
                          <p className="text-sm text-orange-200 font-medium">
                            Listening... Speak clearly to add content to your syllabus
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </ModalBody>
                
                <ModalFooter className="flex justify-end gap-4">
                  <Button 
                    variant="light" 
                    onPress={onClose}
                    className="text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 px-6 py-2 font-medium"
                  >
                    Cancel
                  </Button>                  <Button 
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold px-8 py-2 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:from-gray-600 disabled:to-gray-700"
                    onPress={handleCreateMindMap}
                    isDisabled={!subjectName.trim() || isCreating}
                    isLoading={isCreating}
                  >
                    {isCreating ? "Creating..." : "Create Mind Map"}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </WavyBackground>
    </div>
  );
}
