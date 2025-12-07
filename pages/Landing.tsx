import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  Brain, 
  Sparkles, 
  Code, 
  Database, 
  TrendingUp, 
  ArrowRight, 
  Check,
  Github,
  Layers,
  Network,
  Rocket
} from 'lucide-react';
import { Button } from '../components/Button';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Generation',
      description: 'Generate novel algorithms inspired by biological and physical systems using advanced AI.'
    },
    {
      icon: Sparkles,
      title: 'Biomimetic Design',
      description: 'Learn from nature\'s most efficient systems to create innovative solutions.'
    },
    {
      icon: Code,
      title: 'Multi-Language Support',
      description: 'Generate code implementations in Python, JavaScript, Java, C++, and more.'
    },
    {
      icon: Database,
      title: 'Algorithm Bank',
      description: 'Store, organize, and manage your algorithm library with version control.'
    },
    {
      icon: Network,
      title: 'Synthesis & Combination',
      description: 'Combine existing algorithms to create powerful hybrid solutions.'
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description: 'Analyze algorithm performance, identify gaps, and track improvements.'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Define Your Problem',
      description: 'Describe the challenge you want to solve or let AI suggest problems.'
    },
    {
      number: '02',
      title: 'Get AI-Generated Algorithm',
      description: 'Our AI creates a novel algorithm inspired by biological or physical systems.'
    },
    {
      number: '03',
      title: 'Refine & Analyze',
      description: 'Review, analyze, and improve your algorithm with AI-powered insights.'
    },
    {
      number: '04',
      title: 'Generate Code',
      description: 'Get ready-to-use code implementations in your preferred language.'
    }
  ];

  const benefits = [
    'Unlimited algorithm generation',
    'AI-powered analysis and improvements',
    'Version control and history tracking',
    'Code generation in multiple languages',
    'Algorithm synthesis and combination',
    'Performance benchmarking',
    'Export and share capabilities',
    'Automated daily algorithm generation'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-slate-900 to-[#020617] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
                BioSynth Architect
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/login')}
                className="hidden sm:flex"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => navigate('/login')}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">AI-Powered Algorithm Generation</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-100 to-teal-200 leading-tight">
              Design Algorithms
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
                Inspired by Nature
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed max-w-3xl mx-auto">
              Harness the power of biomimicry and AI to synthesize novel algorithms. 
              Generate, analyze, and implement solutions inspired by the complexity of biological and physical systems.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg"
                onClick={() => navigate('/login')}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-lg px-8 py-6"
              >
                Start Creating
                <Rocket className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="secondary"
                size="lg"
                onClick={() => navigate('/login')}
                className="text-lg px-8 py-6"
              >
                View Examples
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 blur-3xl rounded-3xl"></div>
            <div className="relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
                    <Brain className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Neural Network</h3>
                  <p className="text-slate-400 text-sm">Inspired by biological neurons</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center mb-4">
                    <Network className="w-6 h-6 text-teal-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Swarm Intelligence</h3>
                  <p className="text-slate-400 text-sm">Based on ant colony behavior</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
                    <Layers className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Genetic Algorithm</h3>
                  <p className="text-slate-400 text-sm">Evolutionary computation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Everything you need to create, manage, and deploy innovative algorithms
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Simple steps to transform your ideas into powerful algorithms
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative"
              >
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 h-full">
                  <div className="text-6xl font-bold text-emerald-500/20 mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-slate-400">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 transform -translate-y-1/2">
                    <ArrowRight className="w-4 h-4 text-emerald-400 absolute -right-2 -top-1.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Everything You Need
              </h2>
              <p className="text-xl text-slate-400 mb-8">
                A comprehensive platform for algorithm design, development, and deployment
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-slate-300">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8">
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">AI-Powered</h3>
                    <p className="text-slate-400">Advanced AI generates innovative solutions</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center">
                    <Code className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Multi-Language</h3>
                    <p className="text-slate-400">Generate code in your preferred language</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center">
                    <Database className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Version Control</h3>
                    <p className="text-slate-400">Track changes and manage versions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-3xl p-12 md:p-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Create?
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Join thousands of developers creating innovative algorithms with AI-powered biomimetic design
            </p>
            <Button 
              size="lg"
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-lg px-8 py-6"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold">BioSynth Architect</span>
            </div>
            <div className="text-slate-400 text-sm">
              © {new Date().getFullYear()} BioSynth Architect. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

