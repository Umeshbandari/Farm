import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Leaf, Egg, BarChart3, Settings } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase'; // Adjust this import path if your file is named or located differently

export default function FarmTracker() {
  const [currentView, setCurrentView] = useState('poultry');
  
  // Poultry state
  const [todaysEggs, setTodaysEggs] = useState(0);
  const [totalEggsStock, setTotalEggsStock] = useState(0);
  const [totalHens, setTotalHens] = useState(0);
  const [femaleHens, setFemaleHens] = useState(0);
  const [maleHens, setMaleHens] = useState(0);
  const [chicks, setChicks] = useState(0);
  const [layingHens, setLayingHens] = useState(0);
  const [incubatingHens, setIncubatingHens] = useState(0);
  const [poultryRecords, setPoultryRecords] = useState([]);
  
  // Garden state
  const [gardenRecords, setGardenRecords] = useState([]);
  const [pieChartData, setPieChartData] = useState({
    superZone: 0,
    recoveryZone: 0,
    noProgress: 0
  });
  
  // News state
  const [newsItems, setNewsItems] = useState([]);
  
  // Admin forms
  const [newPoultryRecord, setNewPoultryRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    event: '',
    notes: ''
  });
  
  const [newGardenRecord, setNewGardenRecord] = useState({
    plant: '',
    variety: '',
    planted: new Date().toISOString().split('T')[0],
    location: '',
    status: 'Super Zone',
    yield: 0
  });
  
  const [newNewsItem, setNewNewsItem] = useState({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Load data from Firebase on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // 1. Load poultry stats
      const statsRef = doc(db, 'farmData', 'poultryStats');
      const statsSnap = await getDoc(statsRef);
      if (statsSnap.exists()) {
        const stats = statsSnap.data();
        setTodaysEggs(stats.todaysEggs || 0);
        setTotalEggsStock(stats.totalEggsStock || 0);
        setTotalHens(stats.totalHens || 0);
        setFemaleHens(stats.femaleHens || 0);
        setMaleHens(stats.maleHens || 0);
        setChicks(stats.chicks || 0);
        setLayingHens(stats.layingHens || 0);
        setIncubatingHens(stats.incubatingHens || 0);
      }
      
      // 2. Load poultry records
      const poultryRecRef = doc(db, 'farmData', 'poultryRecords');
      const poultryRecSnap = await getDoc(poultryRecRef);
      if (poultryRecSnap.exists()) {
        setPoultryRecords(poultryRecSnap.data().records || []);
      }
      
      // 3. Load garden records
      const gardenRecRef = doc(db, 'farmData', 'gardenRecords');
      const gardenRecSnap = await getDoc(gardenRecRef);
      if (gardenRecSnap.exists()) {
        const records = gardenRecSnap.data().records || [];
        setGardenRecords(records);
        updatePieChart(records, false); // Update pie chart state without saving back to DB
      }
      
      // 4. Load news items
      const newsRef = doc(db, 'farmData', 'newsItems');
      const newsSnap = await getDoc(newsRef);
      if (newsSnap.exists()) {
        setNewsItems(newsSnap.data().items || []);
      }
      
    } catch (error) {
      console.error('Error loading data from Firebase:', error);
    }
  };

  // Firebase Save Functions
  const savePoultryStats = async () => {
    const stats = {
      todaysEggs, totalEggsStock, totalHens, femaleHens, 
      maleHens, chicks, layingHens, incubatingHens
    };
    await setDoc(doc(db, 'farmData', 'poultryStats'), stats);
  };

  const savePoultryRecords = async (records) => {
    await setDoc(doc(db, 'farmData', 'poultryRecords'), { records });
  };

  const saveGardenRecords = async (records) => {
    await setDoc(doc(db, 'farmData', 'gardenRecords'), { records });
    updatePieChart(records, true);
  };

  const saveNewsItems = async (items) => {
    await setDoc(doc(db, 'farmData', 'newsItems'), { items });
  };

  // Update pie chart based on garden records
  const updatePieChart = (records, shouldSave = false) => {
    const superZone = records.filter(r => r.status === 'Super Zone').length;
    const recoveryZone = records.filter(r => r.status === 'Recovery Zone').length;
    const noProgress = records.filter(r => r.status === 'No Progress').length;
    const newPieData = { superZone, recoveryZone, noProgress };
    
    setPieChartData(newPieData);
    if (shouldSave) {
      setDoc(doc(db, 'farmData', 'pieChartData'), newPieData);
    }
  };

  // Auto-save poultry stats when they change
  useEffect(() => {
    if (totalHens > 0 || todaysEggs > 0 || totalEggsStock > 0) {
      savePoultryStats();
    }
  }, [todaysEggs, totalEggsStock, totalHens, femaleHens, maleHens, chicks, layingHens, incubatingHens]);

  // Admin functions
  const addPoultryRecord = () => {
    if (newPoultryRecord.event) {
      const updated = [...poultryRecords, { ...newPoultryRecord, id: Date.now() }];
      setPoultryRecords(updated);
      savePoultryRecords(updated);
      setNewPoultryRecord({ date: new Date().toISOString().split('T')[0], event: '', notes: '' });
    }
  };

  const deletePoultryRecord = (id) => {
    const updated = poultryRecords.filter(r => r.id !== id);
    setPoultryRecords(updated);
    savePoultryRecords(updated);
  };

  const addGardenRecord = () => {
    if (newGardenRecord.plant && newGardenRecord.variety) {
      const updated = [...gardenRecords, { ...newGardenRecord, id: Date.now() }];
      setGardenRecords(updated);
      saveGardenRecords(updated);
      setNewGardenRecord({
        plant: '', variety: '', planted: new Date().toISOString().split('T')[0],
        location: '', status: 'Super Zone', yield: 0
      });
    }
  };

  const deleteGardenRecord = (id) => {
    const updated = gardenRecords.filter(r => r.id !== id);
    setGardenRecords(updated);
    saveGardenRecords(updated);
  };

  const addNewsItem = () => {
    if (newNewsItem.title && newNewsItem.content) {
      const updated = [...newsItems, { ...newNewsItem, id: Date.now() }];
      setNewsItems(updated);
      saveNewsItems(updated);
      setNewNewsItem({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
    }
  };

  const deleteNewsItem = (id) => {
    const updated = newsItems.filter(n => n.id !== id);
    setNewsItems(updated);
    saveNewsItems(updated);
  };

  // Pie Chart Component
  const PieChart = () => {
    const total = pieChartData.superZone + pieChartData.recoveryZone + pieChartData.noProgress;
    if (total === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-stone-400">
          <p className="text-center">డేటా లేదు<br/><span className="text-sm">Add garden records to see chart</span></p>
        </div>
      );
    }
    
    const superPercent = (pieChartData.superZone / total) * 100;
    const recoveryPercent = (pieChartData.recoveryZone / total) * 100;
    const noProgressPercent = (pieChartData.noProgress / total) * 100;
    
    return (
      <div className="space-y-6">
        <div className="relative h-64 flex items-center justify-center">
          <svg className="transform -rotate-90" width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#e7e5e4" strokeWidth="20"/>
            <circle 
              cx="100" cy="100" r="90" fill="none" stroke="#22c55e" strokeWidth="20"
              strokeDasharray={`${superPercent * 5.65} ${565 - superPercent * 5.65}`}
              strokeDashoffset="0" className="transition-all duration-1000"
            />
            <circle 
              cx="100" cy="100" r="90" fill="none" stroke="#f97316" strokeWidth="20"
              strokeDasharray={`${recoveryPercent * 5.65} ${565 - recoveryPercent * 5.65}`}
              strokeDashoffset={`-${superPercent * 5.65}`} className="transition-all duration-1000"
            />
            <circle 
              cx="100" cy="100" r="90" fill="none" stroke="#ef4444" strokeWidth="20"
              strokeDasharray={`${noProgressPercent * 5.65} ${565 - noProgressPercent * 5.65}`}
              strokeDashoffset={`-${(superPercent + recoveryPercent) * 5.65}`} className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-stone-800">{total}</div>
              <div className="text-sm text-stone-600">మొక్కలు</div>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="font-medium text-stone-800">Super Zone</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-stone-900">{pieChartData.superZone}</div>
              <div className="text-xs text-stone-600">{superPercent.toFixed(1)}%</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500"></div>
              <span className="font-medium text-stone-800">Recovery Zone</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-stone-900">{pieChartData.recoveryZone}</div>
              <div className="text-xs text-stone-600">{recoveryPercent.toFixed(1)}%</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="font-medium text-stone-800">No Progress</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-stone-900">{pieChartData.noProgress}</div>
              <div className="text-xs text-stone-600">{noProgressPercent.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Performance Comparison Component
  const PerformanceOverview = () => {
    const totalGardenYield = gardenRecords.reduce((sum, r) => sum + (r.yield || 0), 0);
    const gardenHealth = pieChartData.superZone / (pieChartData.superZone + pieChartData.recoveryZone + pieChartData.noProgress || 1) * 100;
    const poultryHealth = layingHens / (totalHens || 1) * 100;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-6 rounded-2xl border-2 border-amber-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Egg className="w-8 h-8 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">కోళ్ళు</span>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-amber-900">{totalHens}</div>
              <div className="text-sm text-amber-700">Total Birds</div>
              <div className="pt-3 border-t border-amber-200">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600">Health Score</span>
                  <span className="font-bold text-amber-900">{poultryHealth.toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-2 bg-amber-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000"
                    style={{ width: `${poultryHealth}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 md:p-6 rounded-2xl border-2 border-emerald-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Leaf className="w-8 h-8 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">చెట్లు</span>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-emerald-900">{gardenRecords.length}</div>
              <div className="text-sm text-emerald-700">Total Plants</div>
              <div className="pt-3 border-t border-emerald-200">
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">Health Score</span>
                  <span className="font-bold text-emerald-900">{gardenHealth.toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-2 bg-emerald-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-1000"
                    style={{ width: `${gardenHealth}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl border border-stone-200 shadow-md">
          <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Comparison
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-stone-600">Egg Production</span>
                <span className="font-semibold text-stone-900">{todaysEggs} today</span>
              </div>
              <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(todaysEggs * 5, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-stone-600">Garden Yield</span>
                <span className="font-semibold text-stone-900">{totalGardenYield} kg</span>
              </div>
              <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(totalGardenYield * 2, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // News Ticker Component
  const NewsTicker = () => {
    if (newsItems.length === 0) return null;
    
    const sortedNews = newsItems.sort((a, b) => new Date(b.date) - new Date(a.date));
    const newsText = sortedNews.map(n => `${n.title}: ${n.content}`).join(' • ');
    
    return (
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 text-white py-2 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap">
          <span className="text-sm font-medium px-4">📰 Latest News: {newsText}</span>
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          .animate-marquee {
            display: inline-block;
            animation: marquee 30s linear infinite;
          }
        `}</style>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-green-50 overflow-x-hidden">
      <header className="bg-gradient-to-r from-green-800 via-emerald-700 to-green-800 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6">
          <h1 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4 tracking-tight">ఇంటి ఎనక</h1>
          <nav className="flex flex-wrap gap-2 md:gap-4">
            <button
              onClick={() => setCurrentView('poultry')}
              className={`px-3 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base ${
                currentView === 'poultry' ? 'bg-white text-green-800 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              కోళ్ళు
            </button>
            <button
              onClick={() => setCurrentView('garden')}
              className={`px-3 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base ${
                currentView === 'garden' ? 'bg-white text-green-800 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              చెట్లు
            </button>
            <button
              onClick={() => setCurrentView('overall')}
              className={`px-3 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base ${
                currentView === 'overall' ? 'bg-white text-green-800 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Overall Records
            </button>
            <button
              onClick={() => setCurrentView('admin')}
              className={`px-3 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm md:text-base ${
                currentView === 'admin' ? 'bg-white text-green-800 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Settings className="w-5 h-5" />
              Admin
            </button>
          </nav>
        </div>
      </header>

      <NewsTicker />

      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-8">
        {currentView === 'poultry' && (
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-amber-900 mb-4 md:mb-6 text-center">కోళ్ళు</h2>
            
            {/* Egg Production Stats */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-6 rounded-2xl border-2 border-amber-200 shadow-lg mb-6">
              <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                <Egg className="w-5 h-5" />
                Egg Production
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-amber-200">
                  <div className="text-sm text-amber-600 mb-1">Today's Eggs</div>
                  <div className="text-3xl font-bold text-amber-900">{todaysEggs}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200">
                  <div className="text-sm text-amber-600 mb-1">Total Eggs (Stock)</div>
                  <div className="text-3xl font-bold text-amber-900">{totalEggsStock}</div>
                </div>
              </div>
            </div>
            
            {/* Flock Statistics */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-6 rounded-2xl border-2 border-amber-200 shadow-lg mb-6">
              <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Flock Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-amber-200 text-center">
                  <div className="text-2xl font-bold text-amber-900">{totalHens}</div>
                  <div className="text-sm text-amber-600">Total Hens</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200 text-center">
                  <div className="text-2xl font-bold text-amber-900">{femaleHens}</div>
                  <div className="text-sm text-amber-600">Female</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200 text-center">
                  <div className="text-2xl font-bold text-amber-900">{maleHens}</div>
                  <div className="text-sm text-amber-600">Male</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200 text-center">
                  <div className="text-2xl font-bold text-amber-900">{chicks}</div>
                  <div className="text-sm text-amber-600">Chicks</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200 text-center">
                  <div className="text-2xl font-bold text-amber-900">{layingHens}</div>
                  <div className="text-sm text-amber-600">Laying Hens</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200 text-center">
                  <div className="text-2xl font-bold text-amber-900">{incubatingHens}</div>
                  <div className="text-sm text-amber-600">Incubating Hens</div>
                </div>
              </div>
            </div>
            
            {/* Recent Records */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border-2 border-amber-200 shadow-lg">
              <h3 className="text-xl font-bold text-amber-900 mb-6">Recent Records</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-amber-200 bg-amber-50">
                      <th className="text-left py-3 px-4 font-semibold text-amber-900">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-amber-900">Event</th>
                      <th className="text-left py-3 px-4 font-semibold text-amber-900">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poultryRecords.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="py-8 text-center text-amber-600">
                          No records yet. Add records from Admin panel.
                        </td>
                      </tr>
                    ) : (
                      poultryRecords.sort((a, b) => new Date(b.date) - new Date(a.date)).map((record, idx) => (
                        <tr key={record.id} className={`border-b border-amber-100 hover:bg-amber-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}`}>
                          <td className="py-3 px-4 font-medium text-amber-900">
                            {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 text-amber-800">{record.event}</td>
                          <td className="py-3 px-4 text-amber-700">{record.notes || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {currentView === 'garden' && (
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-emerald-900 mb-4 md:mb-6 text-center">చెట్లు</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white p-4 md:p-6 rounded-2xl border-2 border-emerald-200 shadow-lg">
                <h3 className="text-lg md:text-xl font-bold text-emerald-900 mb-4 md:mb-6 text-center">Plant Health Distribution</h3>
                <PieChart />
              </div>

              <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-2xl border-2 border-emerald-200 shadow-lg">
                <h3 className="text-lg md:text-xl font-bold text-emerald-900 mb-4 md:mb-6">Garden Records</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-emerald-200 bg-emerald-50">
                        <th className="text-left py-3 px-4 font-semibold text-emerald-900">Plant</th>
                        <th className="text-left py-3 px-4 font-semibold text-emerald-900">Variety</th>
                        <th className="text-left py-3 px-4 font-semibold text-emerald-900">Planted</th>
                        <th className="text-left py-3 px-4 font-semibold text-emerald-900">Location</th>
                        <th className="text-left py-3 px-4 font-semibold text-emerald-900">Status</th>
                        <th className="text-right py-3 px-4 font-semibold text-emerald-900">Yield (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gardenRecords.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-emerald-600">
                            No records yet. Add records from Admin panel.
                          </td>
                        </tr>
                      ) : (
                        gardenRecords.map((record, idx) => (
                          <tr key={record.id} className={`border-b border-emerald-100 hover:bg-emerald-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/30'}`}>
                            <td className="py-3 px-4 font-medium text-emerald-900">{record.plant}</td>
                            <td className="py-3 px-4 text-emerald-800">{record.variety}</td>
                            <td className="py-3 px-4 text-emerald-700">
                              {new Date(record.planted).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="py-3 px-4 text-emerald-700">{record.location}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                record.status === 'Super Zone' ? 'bg-green-100 text-green-800 border border-green-300' :
                                record.status === 'Recovery Zone' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                'bg-red-100 text-red-800 border border-red-300'
                              }`}>
                                {record.status === 'Super Zone' ? '🟢' : record.status === 'Recovery Zone' ? '🟠' : '🔴'} {record.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-900">{record.yield}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'overall' && (
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-4 md:mb-6 text-center">Overall Records</h2>
            <PerformanceOverview />
          </div>
        )}

        {currentView === 'admin' && (
          <div className="space-y-6 md:space-y-8">
            <h2 className="text-2xl md:text-3xl font-bold text-green-900 mb-4 md:mb-6 text-center">Admin Panel</h2>
            
            {/* Poultry Data Management */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-6 rounded-2xl border-2 border-amber-200">
              <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                <Egg className="w-5 h-5" />
                Poultry Data
              </h3>
              
              <div className="bg-white p-3 md:p-5 rounded-xl border border-amber-200 mb-4">
                <h4 className="font-semibold text-amber-800 mb-3">Egg Production</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-amber-700 mb-1 block">Today's Eggs</label>
                    <input
                      type="number"
                      value={todaysEggs}
                      onChange={(e) => setTodaysEggs(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border-2 border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-amber-700 mb-1 block">Total Eggs (Stock)</label>
                    <input
                      type="number"
                      value={totalEggsStock}
                      onChange={(e) => setTotalEggsStock(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border-2 border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none font-semibold"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-3 md:p-5 rounded-xl border border-amber-200 mb-4">
                <h4 className="font-semibold text-amber-800 mb-3">Flock Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Total Hens', value: totalHens, setter: setTotalHens },
                    { label: 'Female', value: femaleHens, setter: setFemaleHens },
                    { label: 'Male', value: maleHens, setter: setMaleHens },
                    { label: 'Chicks', value: chicks, setter: setChicks },
                    { label: 'Laying Hens', value: layingHens, setter: setLayingHens },
                    { label: 'Incubating Hens', value: incubatingHens, setter: setIncubatingHens },
                  ].map((field) => (
                    <div key={field.label}>
                      <label className="text-xs font-medium text-amber-700 mb-1 block">{field.label}</label>
                      <input
                        type="number"
                        value={field.value}
                        onChange={(e) => field.setter(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border-2 border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none font-semibold"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white p-3 md:p-4 rounded-xl border border-amber-200 mb-4">
                <h4 className="font-semibold text-amber-800 mb-3">Add Poultry Record</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input
                    type="date"
                    value={newPoultryRecord.date}
                    onChange={(e) => setNewPoultryRecord({ ...newPoultryRecord, date: e.target.value })}
                    className="px-4 py-2 border-2 border-amber-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Event (e.g., New Chicks)"
                    value={newPoultryRecord.event}
                    onChange={(e) => setNewPoultryRecord({ ...newPoultryRecord, event: e.target.value })}
                    className="px-4 py-2 border-2 border-amber-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    value={newPoultryRecord.notes}
                    onChange={(e) => setNewPoultryRecord({ ...newPoultryRecord, notes: e.target.value })}
                    className="px-4 py-2 border-2 border-amber-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                  />
                </div>
                <button
                  onClick={addPoultryRecord}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-2 rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all flex items-center justify-center gap-2 font-semibold shadow-md"
                >
                  <Plus className="w-5 h-5" /> Add Poultry Record
                </button>
              </div>
              
              <div className="text-sm text-amber-700 mb-2 font-medium">Recent Records:</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {poultryRecords.length === 0 ? (
                  <p className="text-amber-600 text-center py-4">No records yet</p>
                ) : (
                  poultryRecords.sort((a, b) => new Date(b.date) - new Date(a.date)).map(record => (
                    <div key={record.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-amber-200">
                      <div className="flex-1">
                        <div className="font-semibold text-amber-900">{record.event}</div>
                        <div className="text-xs text-amber-600">
                          {new Date(record.date).toLocaleDateString()} {record.notes && `• ${record.notes}`}
                        </div>
                      </div>
                      <button onClick={() => deletePoultryRecord(record.id)} className="text-red-500 hover:text-red-700 p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Garden Data Management */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 md:p-6 rounded-2xl border-2 border-emerald-200">
              <h3 className="text-xl font-bold text-emerald-900 mb-4 flex items-center gap-2">
                <Leaf className="w-5 h-5" />
                Garden Data
              </h3>
              <div className="bg-white p-3 md:p-4 rounded-xl border border-emerald-200 mb-4">
                <h4 className="font-semibold text-emerald-800 mb-3">Add Garden Record</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Plant name"
                    value={newGardenRecord.plant}
                    onChange={(e) => setNewGardenRecord({ ...newGardenRecord, plant: e.target.value })}
                    className="px-4 py-2 border-2 border-emerald-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Variety"
                    value={newGardenRecord.variety}
                    onChange={(e) => setNewGardenRecord({ ...newGardenRecord, variety: e.target.value })}
                    className="px-4 py-2 border-2 border-emerald-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={newGardenRecord.location}
                    onChange={(e) => setNewGardenRecord({ ...newGardenRecord, location: e.target.value })}
                    className="px-4 py-2 border-2 border-emerald-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input
                    type="date"
                    value={newGardenRecord.planted}
                    onChange={(e) => setNewGardenRecord({ ...newGardenRecord, planted: e.target.value })}
                    className="px-4 py-2 border-2 border-emerald-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                  <select
                    value={newGardenRecord.status}
                    onChange={(e) => setNewGardenRecord({ ...newGardenRecord, status: e.target.value })}
                    className="px-4 py-2 border-2 border-emerald-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  >
                    <option value="Super Zone">🟢 Super Zone</option>
                    <option value="Recovery Zone">🟠 Recovery Zone</option>
                    <option value="No Progress">🔴 No Progress</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Yield (kg)"
                    value={newGardenRecord.yield}
                    onChange={(e) => setNewGardenRecord({ ...newGardenRecord, yield: Number(e.target.value) })}
                    className="px-4 py-2 border-2 border-emerald-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>
                <button
                  onClick={addGardenRecord}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-2 rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all flex items-center justify-center gap-2 font-semibold shadow-md"
                >
                  <Plus className="w-5 h-5" /> Add Garden Record
                </button>
              </div>
              <div className="text-sm text-emerald-700 mb-2 font-medium">Recent Records:</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {gardenRecords.length === 0 ? (
                  <p className="text-emerald-600 text-center py-4">No records yet</p>
                ) : (
                  gardenRecords.sort((a, b) => new Date(b.planted) - new Date(a.planted)).map(record => (
                    <div key={record.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-emerald-200">
                      <div className="flex-1">
                        <div className="font-semibold text-emerald-900">{record.plant} - {record.variety}</div>
                        <div className="text-xs text-emerald-600">
                          {record.location} • {record.status} • {record.yield} kg
                        </div>
                      </div>
                      <button onClick={() => deleteGardenRecord(record.id)} className="text-red-500 hover:text-red-700 p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* News Management */}
            <div className="bg-gradient-to-br from-stone-50 to-stone-100 p-4 md:p-6 rounded-2xl border-2 border-stone-300">
              <h3 className="text-xl font-bold text-stone-900 mb-4">News & Updates</h3>
              <div className="bg-white p-3 md:p-4 rounded-xl border border-stone-300 mb-4">
                <div className="grid grid-cols-1 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="News title"
                    value={newNewsItem.title}
                    onChange={(e) => setNewNewsItem({ ...newNewsItem, title: e.target.value })}
                    className="px-4 py-2 border-2 border-stone-300 rounded-lg focus:border-stone-500 focus:ring-2 focus:ring-stone-200 outline-none"
                  />
                  <textarea
                    placeholder="News content"
                    value={newNewsItem.content}
                    onChange={(e) => setNewNewsItem({ ...newNewsItem, content: e.target.value })}
                    className="px-4 py-2 border-2 border-stone-300 rounded-lg focus:border-stone-500 focus:ring-2 focus:ring-stone-200 outline-none resize-none"
                    rows="3"
                  />
                  <input
                    type="date"
                    value={newNewsItem.date}
                    onChange={(e) => setNewNewsItem({ ...newNewsItem, date: e.target.value })}
                    className="px-4 py-2 border-2 border-stone-300 rounded-lg focus:border-stone-500 focus:ring-2 focus:ring-stone-200 outline-none"
                  />
                </div>
                <button
                  onClick={addNewsItem}
                  className="w-full bg-gradient-to-r from-stone-700 to-stone-800 text-white px-6 py-2 rounded-lg hover:from-stone-800 hover:to-stone-900 transition-all flex items-center justify-center gap-2 font-semibold shadow-md"
                >
                  <Plus className="w-5 h-5" /> Add News Item
                </button>
              </div>
              <div className="text-sm text-stone-700 mb-2 font-medium">Recent News:</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {newsItems.length === 0 ? (
                  <p className="text-stone-600 text-center py-4">No news yet</p>
                ) : (
                  newsItems.sort((a, b) => new Date(b.date) - new Date(a.date)).map(news => (
                    <div key={news.id} className="flex justify-between items-start bg-white p-3 rounded-lg border border-stone-300">
                      <div className="flex-1">
                        <div className="font-semibold text-stone-900">{news.title}</div>
                        <div className="text-sm text-stone-600 mt-1">{news.content}</div>
                        <div className="text-xs text-stone-500 mt-1">
                          {new Date(news.date).toLocaleDateString()}
                        </div>
                      </div>
                      <button onClick={() => deleteNewsItem(news.id)} className="text-red-500 hover:text-red-700 p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}