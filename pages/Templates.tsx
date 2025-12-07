import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { algorithmApi } from '../services/api';
import { BioAlgorithm } from '../types';
import { FileCode, Sparkles, Copy, Check, Search, Filter } from 'lucide-react';
import { Button } from '../components/Button';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  template: Partial<BioAlgorithm>;
}

const Templates: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    const defaultTemplates: Template[] = [
      {
        id: 'genetic-algorithm',
        name: 'Genetic Algorithm',
        description: 'Evolutionary algorithm template for optimization problems',
        category: 'optimization',
        icon: '🧬',
        template: {
          name: 'Genetic Algorithm',
          domain: 'Optimization',
          inspiration: 'Natural selection and evolution',
          principle: 'Evolve a population of candidate solutions through selection, crossover, and mutation',
          description: 'A metaheuristic inspired by the process of natural selection that belongs to the larger class of evolutionary algorithms.',
          steps: [
            'Initialize population with random solutions',
            'Evaluate fitness of each solution',
            'Select parents based on fitness',
            'Create offspring through crossover',
            'Apply mutation to offspring',
            'Replace population with new generation',
            'Repeat until termination condition'
          ],
          applications: ['Optimization', 'Machine Learning', 'Scheduling', 'Game AI'],
          tags: ['optimization', 'evolutionary', 'metaheuristic'],
          pseudoCode: `function genetic_algorithm():
  population = initialize_population()
  while not termination_condition():
    fitness = evaluate(population)
    parents = select(population, fitness)
    offspring = crossover(parents)
    offspring = mutate(offspring)
    population = replace(population, offspring)
  return best_solution(population)`
        }
      },
      {
        id: 'neural-network',
        name: 'Neural Network',
        description: 'Artificial neural network template inspired by biological neurons',
        category: 'machine-learning',
        icon: '🧠',
        template: {
          name: 'Neural Network',
          domain: 'Machine Learning',
          inspiration: 'Biological neural networks',
          principle: 'Interconnected nodes (neurons) process information through weighted connections',
          description: 'Computational model inspired by biological neural networks that constitute animal brains.',
          steps: [
            'Initialize network architecture',
            'Set random weights and biases',
            'Forward propagate input through layers',
            'Calculate error using loss function',
            'Backpropagate error to update weights',
            'Repeat for multiple epochs',
            'Validate on test data'
          ],
          applications: ['Image Recognition', 'Natural Language Processing', 'Predictive Analytics'],
          tags: ['machine-learning', 'neural-network', 'deep-learning'],
          pseudoCode: `function neural_network(input):
  for layer in layers:
    input = activation(weights * input + bias)
  return input

function train_network(data):
  for epoch in epochs:
    for sample in data:
      output = neural_network(sample.input)
      error = loss_function(output, sample.target)
      update_weights(backpropagate(error))`
        }
      },
      {
        id: 'ant-colony',
        name: 'Ant Colony Optimization',
        description: 'Swarm intelligence algorithm for pathfinding and optimization',
        category: 'optimization',
        icon: '🐜',
        template: {
          name: 'Ant Colony Optimization',
          domain: 'Optimization',
          inspiration: 'Ant foraging behavior',
          principle: 'Ants deposit pheromones on paths, creating positive feedback for optimal routes',
          description: 'Probabilistic technique for solving computational problems by finding good paths through graphs.',
          steps: [
            'Initialize pheromone trails',
            'Place ants at starting positions',
            'Each ant constructs solution probabilistically',
            'Update pheromone trails based on solution quality',
            'Evaporate pheromones to prevent stagnation',
            'Repeat until convergence',
            'Return best solution found'
          ],
          applications: ['Traveling Salesman', 'Vehicle Routing', 'Network Routing'],
          tags: ['optimization', 'swarm-intelligence', 'pathfinding'],
          pseudoCode: `function ant_colony_optimization():
  initialize_pheromones()
  while not converged:
    solutions = []
    for ant in ants:
      solution = construct_solution(ant)
      solutions.append(solution)
    update_pheromones(solutions)
    evaporate_pheromones()
  return best_solution()`
        }
      },
      {
        id: 'particle-swarm',
        name: 'Particle Swarm Optimization',
        description: 'Swarm intelligence algorithm for continuous optimization',
        category: 'optimization',
        icon: '🐦',
        template: {
          name: 'Particle Swarm Optimization',
          domain: 'Optimization',
          inspiration: 'Bird flocking and fish schooling',
          principle: 'Particles move through solution space, influenced by personal and global best positions',
          description: 'Population-based stochastic optimization algorithm inspired by social behavior of birds and fish.',
          steps: [
            'Initialize swarm of particles',
            'Evaluate fitness of each particle',
            'Update personal best positions',
            'Update global best position',
            'Update velocity based on personal and global best',
            'Update particle positions',
            'Repeat until convergence'
          ],
          applications: ['Function Optimization', 'Neural Network Training', 'Parameter Tuning'],
          tags: ['optimization', 'swarm-intelligence', 'continuous'],
          pseudoCode: `function particle_swarm_optimization():
  swarm = initialize_swarm()
  global_best = find_best(swarm)
  while not converged:
    for particle in swarm:
      update_velocity(particle, global_best)
      update_position(particle)
      update_personal_best(particle)
    global_best = find_best(swarm)
  return global_best`
        }
      },
      {
        id: 'simulated-annealing',
        name: 'Simulated Annealing',
        description: 'Probabilistic optimization technique inspired by metallurgy',
        category: 'optimization',
        icon: '🔥',
        template: {
          name: 'Simulated Annealing',
          domain: 'Optimization',
          inspiration: 'Annealing process in metallurgy',
          principle: 'Accept worse solutions probabilistically to escape local optima, gradually reducing acceptance probability',
          description: 'Probabilistic technique for approximating the global optimum of a given function.',
          steps: [
            'Initialize solution and temperature',
            'Generate neighboring solution',
            'Calculate cost difference',
            'Accept better solutions always',
            'Accept worse solutions probabilistically',
            'Decrease temperature',
            'Repeat until temperature is low'
          ],
          applications: ['Combinatorial Optimization', 'Scheduling', 'Layout Design'],
          tags: ['optimization', 'probabilistic', 'global-search'],
          pseudoCode: `function simulated_annealing():
  current = initial_solution()
  temperature = initial_temperature()
  while temperature > min_temperature:
    neighbor = generate_neighbor(current)
    delta = cost(neighbor) - cost(current)
    if delta < 0 or random() < exp(-delta / temperature):
      current = neighbor
    temperature = cool(temperature)
  return current`
        }
      },
      {
        id: 'cellular-automata',
        name: 'Cellular Automata',
        description: 'Discrete model for complex systems with local interactions',
        category: 'simulation',
        icon: '🔲',
        template: {
          name: 'Cellular Automata',
          domain: 'Simulation',
          inspiration: 'Self-organizing systems in nature',
          principle: 'Grid of cells evolve based on local rules, creating emergent global behavior',
          description: 'Discrete model studied in computability theory, mathematics, and theoretical biology.',
          steps: [
            'Initialize grid with initial state',
            'Define transition rules',
            'For each cell, apply rules based on neighbors',
            'Update all cells simultaneously',
            'Repeat for multiple generations',
            'Analyze emergent patterns'
          ],
          applications: ['Pattern Generation', 'Traffic Simulation', 'Cryptography'],
          tags: ['simulation', 'emergent-behavior', 'discrete'],
          pseudoCode: `function cellular_automata():
  grid = initialize_grid()
  rules = define_rules()
  for generation in generations:
    new_grid = copy(grid)
    for cell in grid:
      neighbors = get_neighbors(cell)
      new_state = apply_rule(cell, neighbors, rules)
      new_grid[cell] = new_state
    grid = new_grid
  return grid`
        }
      }
    ];
    setTemplates(defaultTemplates);
  };

  const useTemplate = async (template: Template) => {
    try {
      const newAlgo = await algorithmApi.create(template.template as any);
      navigate(`/algorithm/${newAlgo.id}`);
    } catch (error: any) {
      alert(`Failed to create algorithm: ${error.message}`);
    }
  };

  const copyTemplate = (template: Template) => {
    const templateJson = JSON.stringify(template.template, null, 2);
    navigator.clipboard.writeText(templateJson);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = ['all', 'optimization', 'machine-learning', 'simulation'];
  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#020617] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <FileCode size={32} className="text-bio-400" />
            Algorithm Templates
          </h1>
          <p className="text-slate-400">Start with pre-built templates for common algorithm patterns</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-bio-500"
            />
          </div>
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-bio-500 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-bio-500/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{template.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{template.name}</h3>
                    <span className="text-xs text-slate-500 uppercase">{template.category}</span>
                  </div>
                </div>
                <button
                  onClick={() => copyTemplate(template)}
                  className="text-slate-500 hover:text-bio-400 transition-colors"
                  title="Copy template JSON"
                >
                  {copiedId === template.id ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-4">{template.description}</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => useTemplate(template)}
                  variant="primary"
                  className="flex-1"
                >
                  <Sparkles size={16} /> Use Template
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No templates found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
};

export default Templates;

