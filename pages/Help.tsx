import React, { useState } from 'react';
import { HelpCircle, Book, Video, MessageCircle, Code, Zap, Search, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';

const Help: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Welcome to BioSynth Architect</h3>
            <p className="text-slate-400">
              BioSynth Architect is an AI-powered platform for generating, analyzing, and managing biological algorithms.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Quick Start Guide</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-400">
              <li>Create an account or log in</li>
              <li>Use the Generator to create your first algorithm</li>
              <li>Run analysis to evaluate your algorithm</li>
              <li>Generate code in your preferred language</li>
              <li>Share and collaborate with others</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'generator',
      title: 'Algorithm Generator',
      icon: Code,
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Creating Algorithms</h3>
            <p className="text-slate-400 mb-4">
              The Generator uses AI to create algorithms based on your inspiration and domain.
            </p>
            <div className="bg-slate-800 rounded-lg p-4 space-y-2">
              <p className="text-sm text-slate-300"><strong>Inspiration:</strong> What biological process inspires your algorithm?</p>
              <p className="text-sm text-slate-300"><strong>Domain:</strong> What field does this apply to? (e.g., optimization, machine learning, data structures)</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Tips for Better Results</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Be specific about your inspiration source</li>
              <li>Clearly define the problem domain</li>
              <li>Consider real-world applications</li>
              <li>Review and refine generated algorithms</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'analysis',
      title: 'Algorithm Analysis',
      icon: Search,
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Understanding Analysis</h3>
            <p className="text-slate-400 mb-4">
              Our AI analyzes algorithms across multiple dimensions to help you understand their strengths and weaknesses.
            </p>
          </div>
          <div className="space-y-3">
            <div className="bg-slate-800 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Sanity Check</h4>
              <p className="text-sm text-slate-400">
                Evaluates the algorithm's conceptual soundness, identifies gaps, and provides an overall score.
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Risk Analysis</h4>
              <p className="text-sm text-slate-400">
                Identifies potential failure modes, edge cases, and areas of concern.
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Evolution Ideas</h4>
              <p className="text-sm text-slate-400">
                Suggests improvements, extensions, and future iterations for your algorithm.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'code-generation',
      title: 'Code Generation',
      icon: Code,
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Generating Code</h3>
            <p className="text-slate-400 mb-4">
              Convert your algorithms into executable code in multiple programming languages.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Supported Languages</h4>
            <div className="grid grid-cols-2 gap-2 text-slate-400">
              <div>• Python</div>
              <div>• JavaScript</div>
              <div>• TypeScript</div>
              <div>• Java</div>
              <div>• C++</div>
              <div>• Go</div>
              <div>• Rust</div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Features</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>AI-powered code generation</li>
              <li>Code execution in sandbox</li>
              <li>Automatic code analysis</li>
              <li>Issue detection and fixes</li>
              <li>Performance benchmarking</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'collaboration',
      title: 'Collaboration',
      icon: MessageCircle,
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Working Together</h3>
            <p className="text-slate-400 mb-4">
              Share algorithms, collaborate in real-time, and build together.
            </p>
          </div>
          <div className="space-y-3">
            <div className="bg-slate-800 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Sharing</h4>
              <p className="text-sm text-slate-400">
                Make algorithms public, share with specific users, or create shareable links.
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Comments</h4>
              <p className="text-sm text-slate-400">
                Discuss algorithms, ask questions, and provide feedback through threaded comments.
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Real-time Collaboration</h4>
              <p className="text-sm text-slate-400">
                Work on algorithms simultaneously with other users in real-time sessions.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Available Shortcuts</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-300">Navigate to Generator</span>
                <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sm text-slate-300">G</kbd>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-300">Navigate to Library</span>
                <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sm text-slate-300">L</kbd>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-300">Open Search</span>
                <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sm text-slate-300">Ctrl+K</kbd>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-300">Toggle Sidebar</span>
                <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sm text-slate-300">Ctrl+B</kbd>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-300">Open Settings</span>
                <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sm text-slate-300">Ctrl+,</kbd>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-300">Open Help</span>
                <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sm text-slate-300">?</kbd>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <HelpCircle size={32} className="text-bio-400" />
            Help & Documentation
          </h1>
          <p className="text-slate-400">Learn how to use BioSynth Architect effectively</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sticky top-6">
              <h2 className="text-lg font-bold text-white mb-4">Topics</h2>
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        activeSection === section.id
                          ? 'bg-bio-500/10 text-bio-400 border border-bio-500/20'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} />
                        <span className="font-medium">{section.title}</span>
                      </div>
                      <ChevronRight 
                        size={16} 
                        className={`transition-transform ${activeSection === section.id ? 'rotate-90' : ''}`}
                      />
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeSection ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                {sections.find(s => s.id === activeSection)?.content}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                <Book size={64} className="mx-auto mb-4 text-slate-500" />
                <h2 className="text-xl font-bold text-white mb-2">Select a Topic</h2>
                <p className="text-slate-400">
                  Choose a topic from the sidebar to learn more about BioSynth Architect
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <Video size={24} className="text-bio-400 mb-3" />
            <h3 className="font-bold text-white mb-2">Video Tutorials</h3>
            <p className="text-sm text-slate-400 mb-4">
              Watch step-by-step video guides
            </p>
            <Button variant="secondary" className="w-full">
              Watch Videos
            </Button>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <MessageCircle size={24} className="text-bio-400 mb-3" />
            <h3 className="font-bold text-white mb-2">Community Support</h3>
            <p className="text-sm text-slate-400 mb-4">
              Get help from the community
            </p>
            <Button variant="secondary" className="w-full">
              Join Community
            </Button>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <Book size={24} className="text-bio-400 mb-3" />
            <h3 className="font-bold text-white mb-2">API Documentation</h3>
            <p className="text-sm text-slate-400 mb-4">
              Explore the API reference
            </p>
            <Button variant="secondary" className="w-full">
              View API Docs
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;

