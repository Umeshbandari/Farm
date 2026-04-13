import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Leaf, Egg, BarChart3, Settings } from 'lucide-react';
import HenProfile from './components/HenProfile';
import titleLogo from './assets/title.png';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase'; // Adjust this import path if your file is named or located differently

export default function FarmTracker() {
  const getDefaultHenProfile = () => ({
    sNo: '',
    name: '',
    dob: '',
    gender: 'kodi',
    photo: '',
    batchId: 1,
    eggsLaid: 0,
    incubatedEggs: 0,
    hatchingChicks: 0,
    layingStartDate: '',
    incubatedDate: '',
    hatchingDate: '',
    batchRecords: [],
    isLaying: false,
    isIncubating: false
  });

  const getDefaultBatchInput = () => ({
    batchId: 1,
    layingStartDate: '',
    eggsLaid: '',
    incubatedEggs: '',
    incubatedDate: '',
    hatchingChicks: '',
    hatchingDate: ''
  });

  const getDefaultBatchLocks = () => ({
    laying: false,
    eggs: false,
    incubation: false,
    hatching: false
  });

  const [currentView, setCurrentView] = useState('poultry');
  const [showBatchSettings, setShowBatchSettings] = useState(false);
  
  // Legacy poultry stat state (kept for backwards compatibility)
  const [todaysEggs, setTodaysEggs] = useState(0);
  const [totalEggsStock, setTotalEggsStock] = useState(0);
  const [totalHens, setTotalHens] = useState(0);
  const [femaleHens, setFemaleHens] = useState(0);
  const [maleHens, setMaleHens] = useState(0);
  const [chicks, setChicks] = useState(0);
  const [layingHens, setLayingHens] = useState(0);
  const [incubatingHens, setIncubatingHens] = useState(0);
  
  // Batch configuration
  const [batches, setBatches] = useState([
    { id: 1, name: 'Batch 1', hatchingRate: 85 },
    { id: 2, name: 'Batch 2', hatchingRate: 90 },
    { id: 3, name: 'Batch 3', hatchingRate: 80 },
    { id: 4, name: 'Batch 4', hatchingRate: 88 },
    { id: 5, name: 'Batch 5', hatchingRate: 75 }
  ]);
  
  // Poultry records (aggregated from hen profiles)
  const [poultryRecords, setPoultryRecords] = useState([]);
  const [henProfiles, setHenProfiles] = useState([]);
  
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
    planted: new Date().toISOString().split('T')[0]
  });
  
  const [newNewsItem, setNewNewsItem] = useState({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [newHenProfile, setNewHenProfile] = useState(getDefaultHenProfile());
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState({});
  const [selectedHenType, setSelectedHenType] = useState('kodi');
  const [selectedHenId, setSelectedHenId] = useState(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [batchInput, setBatchInput] = useState(getDefaultBatchInput());
  const [batchLocks, setBatchLocks] = useState(getDefaultBatchLocks());
  const [batchInfoMessage, setBatchInfoMessage] = useState('');

  const uploadProfilePhotoIfNeeded = async (profileName) => {
    if (!profilePhotoFile) return null;

    const safeName = (profileName || 'hen').trim().replace(/\s+/g, '-').toLowerCase();
    const fileExt = profilePhotoFile.name.includes('.') ? profilePhotoFile.name.split('.').pop() : 'jpg';
    const fileName = `${Date.now()}-${safeName}.${fileExt}`;
    const photoRef = ref(storage, `hen-profiles/${fileName}`);

    await uploadBytes(photoRef, profilePhotoFile);
    return getDownloadURL(photoRef);
  };
  
  // Calculate hatching rate
  const calculateHatchingRate = (chicks, incubated) => {
    if (!incubated || incubated === 0) return 0;
    return ((chicks / incubated) * 100).toFixed(2);
  };

  const normalizeHenProfile = (profile) => ({
    ...getDefaultHenProfile(),
    ...profile,
    batchRecords: Array.isArray(profile?.batchRecords) ? profile.batchRecords : []
  });

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
      
      // 2a. Load hen profiles
      const henProfilesRef = doc(db, 'farmData', 'henProfiles');
      const henProfilesSnap = await getDoc(henProfilesRef);
      if (henProfilesSnap.exists()) {
        setHenProfiles(henProfilesSnap.data().profiles || []);
      }
      
      // 3. Load garden records
      const gardenRecRef = doc(db, 'farmData', 'gardenRecords');
      const gardenRecSnap = await getDoc(gardenRecRef);
      if (gardenRecSnap.exists()) {
        const records = gardenRecSnap.data().records || [];
        setGardenRecords(records);
        updatePieChart(records, false);
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

  // Load data from Firebase on mount
  useEffect(() => {
    loadAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const saveHenProfiles = async (profiles) => {
    await setDoc(doc(db, 'farmData', 'henProfiles'), { profiles });
  };

  const saveGardenRecords = async (records) => {
    await setDoc(doc(db, 'farmData', 'gardenRecords'), { records });
    updatePieChart(records, true);
  };

  const saveNewsItems = async (items) => {
    await setDoc(doc(db, 'farmData', 'newsItems'), { items });
  };

  // Update pie chart based on garden records
  const updatePieChart = async (records, shouldSave = false) => {
    const superZone = records.filter(r => r.status === 'Super Zone').length;
    const recoveryZone = records.filter(r => r.status === 'Recovery Zone').length;
    const noProgress = records.filter(r => r.status === 'No Progress').length;
    const newPieData = { superZone, recoveryZone, noProgress };
    
    setPieChartData(newPieData);
    if (shouldSave) {
      await setDoc(doc(db, 'farmData', 'pieChartData'), newPieData);
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

  const clearAllRecentRecords = () => {
    if (window.confirm('Are you sure you want to delete all recent records? This cannot be undone.')) {
      setPoultryRecords([]);
      savePoultryRecords([]);
    }
  };

  const eraseAllPoultryData = () => {
    if (window.confirm('Are you sure you want to erase all poultry data? This cannot be undone.')) {
      setPoultryRecords([]);
      savePoultryRecords([]);
      setHenProfiles([]);
      saveHenProfiles([]);
    }
  };

  const addGardenRecord = () => {
    if (newGardenRecord.plant && newGardenRecord.variety) {
      const newRecord = {
        plant: newGardenRecord.plant,
        variety: newGardenRecord.variety,
        planted: newGardenRecord.planted
      };
      const updated = [...gardenRecords, { ...newRecord, id: Date.now() }];
      setGardenRecords(updated);
      saveGardenRecords(updated);
      setNewGardenRecord({
        plant: '', variety: '', planted: new Date().toISOString().split('T')[0]
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

  const addHenProfile = async () => {
    const normalizedProfile = normalizeHenProfile(newHenProfile);
    const errors = {};
    if (!normalizedProfile.name.trim()) errors.name = 'Name is required';
    if (!normalizedProfile.dob) errors.dob = 'Date of Birth is required';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors({});

    try {
      setIsPhotoUploading(true);
      const uploadedPhotoUrl = await uploadProfilePhotoIfNeeded(normalizedProfile.name);
      const finalPhoto = uploadedPhotoUrl || normalizedProfile.photo || '';
      const sNo = henProfiles.length + 1;
      const hatchingRate = calculateHatchingRate(normalizedProfile.hatchingChicks, normalizedProfile.incubatedEggs);
      const updated = [...henProfiles, {
        ...normalizedProfile,
        photo: finalPhoto,
        sNo,
        hatchingRate,
        eggsIncubated: normalizedProfile.incubatedEggs,
        chicksHatched: normalizedProfile.hatchingChicks,
        id: Date.now()
      }];
      setHenProfiles(updated);
      saveHenProfiles(updated);
      setNewHenProfile(getDefaultHenProfile());
      setProfilePhotoFile(null);
      setFormErrors({});
    } catch (error) {
      console.error('Profile photo upload failed:', error);
      setFormErrors((prev) => ({ ...prev, photo: 'Photo upload failed. Please try again.' }));
    } finally {
      setIsPhotoUploading(false);
    }
  };
  
  const deleteHenProfile = (id) => {
    const deletingHen = henProfiles.find((h) => String(h.id) === String(id));
    const updated = henProfiles.filter(h => h.id !== id);
    setHenProfiles(updated);
    saveHenProfiles(updated);

    const cleanedRecords = poultryRecords.filter((record) => {
      const matchesByHenId = String(record.henId || '') === String(id);
      const matchesByName = deletingHen?.name && String(record.notes || '').trim() === String(deletingHen.name).trim();
      return !(matchesByHenId || matchesByName);
    });
    setPoultryRecords(cleanedRecords);
    savePoultryRecords(cleanedRecords);
  };

  const getNextGlobalBatchId = () => {
    const allBatchIds = henProfiles.flatMap((hen) =>
      (Array.isArray(hen.batchRecords) ? hen.batchRecords : []).map((record) => Number(record.batchId || 0))
    );
    const maxBatchId = allBatchIds.length > 0 ? Math.max(...allBatchIds) : 0;
    return maxBatchId + 1;
  };
  
  const updateHenProfile = (id) => {
    const hen = henProfiles.find(h => String(h.id) === String(id));
    if (hen) {
      const nextBatchId = getNextGlobalBatchId();
      setNewHenProfile(normalizeHenProfile(hen));
      setSelectedHenId(hen.id);
      setProfilePhotoFile(null);
      setBatchInput({ ...getDefaultBatchInput(), batchId: nextBatchId });
      setBatchLocks(getDefaultBatchLocks());
      setBatchInfoMessage('');
      setFormErrors((prev) => ({ ...prev, batchId: undefined, selectedHen: undefined }));
    }
  };

  const loadBatchIfExists = (batchIdValue) => {
    const parsedBatchId = Number(batchIdValue);
    if (!parsedBatchId) {
      setBatchInput({ ...getDefaultBatchInput(), batchId: '' });
      setBatchLocks(getDefaultBatchLocks());
      setBatchInfoMessage('');
      return;
    }

    const existingRecords = Array.isArray(newHenProfile.batchRecords) ? newHenProfile.batchRecords : [];
    const existingBatch = existingRecords.find((record) => Number(record.batchId) === parsedBatchId);

    if (existingBatch) {
      setBatchInput({
        batchId: parsedBatchId,
        layingStartDate: existingBatch.layingStartDate || '',
        eggsLaid: String(existingBatch.eggsLaid ?? ''),
        incubatedEggs: String(existingBatch.incubatedEggs ?? ''),
        incubatedDate: existingBatch.incubatedDate || '',
        hatchingChicks: String(existingBatch.hatchingChicks ?? ''),
        hatchingDate: existingBatch.hatchingDate || ''
      });
      setBatchLocks({ laying: true, eggs: true, incubation: true, hatching: true });
      setBatchInfoMessage(`This batch no is already existed for hen ${newHenProfile.name || 'name'}`);
    } else {
      const batchInAnotherHen = henProfiles.find((hen) =>
        String(hen.id) !== String(selectedHenId) &&
        (Array.isArray(hen.batchRecords) ? hen.batchRecords : []).some((record) => Number(record.batchId) === parsedBatchId)
      );

      setBatchInput({ ...getDefaultBatchInput(), batchId: parsedBatchId });
      setBatchLocks(getDefaultBatchLocks());
      if (batchInAnotherHen) {
        setBatchInfoMessage(`This batch no is already existed for hen ${batchInAnotherHen.name || 'name'}`);
      } else {
        setBatchInfoMessage('');
      }
    }
  };

  const lockBatchStage = (stageKey) => {
    const alreadyLocked = batchLocks[stageKey];
    if (alreadyLocked) return;

    setBatchLocks((prev) => ({ ...prev, [stageKey]: true }));

    if (stageKey !== 'incubation' && stageKey !== 'hatching') return;

    if (!selectedHenId) return;
    const currentHen = henProfiles.find((hen) => String(hen.id) === String(selectedHenId));
    const stageLabelMap = {
      incubation: 'Locked Incubated Eggs & Date',
      hatching: 'Locked Hatching Chicks & Date'
    };

    const lockEvent = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      date: new Date().toISOString().split('T')[0],
      event: `${stageLabelMap[stageKey] || 'Locked batch stage'} (Batch ${batchInput.batchId || '-'})`,
      notes: currentHen?.name || 'Unnamed',
      henId: currentHen?.id || null,
      batchId: Number(batchInput.batchId || 0),
      source: 'batch-lock'
    };

    const updatedRecords = [...poultryRecords, lockEvent];
    setPoultryRecords(updatedRecords);
    savePoultryRecords(updatedRecords);
  };

  const submitBatchForSelectedHen = async () => {
    const errors = {};
    if (!selectedHenId) errors.selectedHen = 'Select a కోడి profile to update';
    if (!batchInput.batchId) errors.batchId = 'Batch number is required';
    if (batchInput.eggsLaid === '') errors.eggsLaid = 'Eggs this batch is required';
    if (batchInput.incubatedEggs === '') errors.incubatedEggs = 'Incubated eggs is required';
    if (batchInput.hatchingChicks === '') errors.hatchingChicks = 'Hatching chicks is required';
    if (Number(batchInput.eggsLaid) < 0) errors.eggsLaid = 'Eggs laid must be positive';
    if (Number(batchInput.incubatedEggs) < 0) errors.incubatedEggs = 'Incubated eggs must be positive';
    if (Number(batchInput.hatchingChicks) < 0) errors.hatchingChicks = 'Hatching chicks must be positive';
    if (Number(batchInput.hatchingChicks) > Number(batchInput.incubatedEggs)) {
      errors.hatchingChicks = 'Hatching chicks cannot exceed incubated eggs';
    }
    if (Number(batchInput.incubatedEggs) > Number(batchInput.eggsLaid)) {
      errors.incubatedEggs = 'Incubated eggs cannot exceed eggs laid';
    }
    if (!batchLocks.laying || !batchLocks.eggs || !batchLocks.incubation || !batchLocks.hatching) {
      errors.batchLocks = 'Check all batch checkboxes to confirm locked values';
    }

    const duplicateHen = henProfiles.find((hen) =>
      (Array.isArray(hen.batchRecords) ? hen.batchRecords : []).some(
        (record) => Number(record.batchId) === Number(batchInput.batchId)
      )
    );
    if (duplicateHen) {
      errors.batchId = `This batch no is already existed for hen ${duplicateHen.name || 'name'}`;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors((prev) => ({ ...prev, ...errors }));
      return;
    }

    const record = {
      id: Date.now(),
      batchId: Number(batchInput.batchId),
      eggsLaid: Number(batchInput.eggsLaid || 0),
      layingStartDate: batchInput.layingStartDate || '',
      incubatedEggs: Number(batchInput.incubatedEggs || 0),
      incubatedDate: batchInput.incubatedDate || '',
      hatchingChicks: Number(batchInput.hatchingChicks || 0),
      hatchingDate: batchInput.hatchingDate || '',
      hatchingRate: calculateHatchingRate(batchInput.hatchingChicks, batchInput.incubatedEggs)
    };

    const currentRecords = Array.isArray(newHenProfile.batchRecords) ? newHenProfile.batchRecords : [];
    const updatedRecords = [...currentRecords, record];
    const totals = updatedRecords.reduce((acc, item) => {
      acc.eggsLaid += Number(item.eggsLaid || 0);
      acc.incubatedEggs += Number(item.incubatedEggs || 0);
      acc.hatchingChicks += Number(item.hatchingChicks || 0);
      return acc;
    }, { eggsLaid: 0, incubatedEggs: 0, hatchingChicks: 0 });

    const updatedProfile = {
      ...newHenProfile,
      batchRecords: updatedRecords,
      eggsLaid: totals.eggsLaid,
      incubatedEggs: totals.incubatedEggs,
      hatchingChicks: totals.hatchingChicks,
      hatchingRate: calculateHatchingRate(totals.hatchingChicks, totals.incubatedEggs)
    };

    const updatedProfiles = henProfiles.map((hen) => String(hen.id) === String(selectedHenId) ? updatedProfile : hen);
    setHenProfiles(updatedProfiles);
    saveHenProfiles(updatedProfiles);
    setNewHenProfile(updatedProfile);
    setBatchInput({ ...getDefaultBatchInput(), batchId: getNextGlobalBatchId() });
    setBatchLocks(getDefaultBatchLocks());
    setBatchInfoMessage('');
    setFormErrors((prev) => ({
      ...prev,
      batchId: undefined,
      layingStartDate: undefined,
      eggsLaid: undefined,
      incubatedEggs: undefined,
      incubatedDate: undefined,
      hatchingChicks: undefined,
      hatchingDate: undefined,
      batchLocks: undefined,
      batchRecords: undefined
    }));
  };

  useEffect(() => {
    const allLocked = batchLocks.laying && batchLocks.eggs && batchLocks.incubation && batchLocks.hatching;
    if (!selectedHenId || !allLocked) return;
    if (batchInfoMessage.startsWith('This batch no is already existed for hen')) return;
    submitBatchForSelectedHen();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchLocks, selectedHenId, batchInfoMessage]);
  
  const saveUpdatedHenProfile = async () => {
    const normalizedProfile = normalizeHenProfile(newHenProfile);
    const errors = {};
    if (!selectedHenId) errors.selectedHen = 'Select a కోడి profile to update';
    
    if (normalizedProfile.gender === 'kodi') {
      if (normalizedProfile.batchRecords.length === 0) {
        errors.batchRecords = 'Add at least one batch record for కోడి';
      }
      if (normalizedProfile.hatchingChicks > normalizedProfile.incubatedEggs) {
        errors.hatchingChicks = 'Hatching chicks cannot exceed incubated eggs';
      }
      if (normalizedProfile.incubatedEggs > normalizedProfile.eggsLaid) {
        errors.incubatedEggs = 'Incubated eggs cannot exceed eggs laid';
      }
      if (normalizedProfile.eggsLaid < 0) errors.eggsLaid = 'Eggs laid must be positive';
      if (normalizedProfile.incubatedEggs < 0) errors.incubatedEggs = 'Incubated eggs must be positive';
      if (normalizedProfile.hatchingChicks < 0) errors.hatchingChicks = 'Hatching chicks must be positive';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors({});

    try {
      setIsPhotoUploading(true);
      const uploadedPhotoUrl = await uploadProfilePhotoIfNeeded(normalizedProfile.name);
      const hatchingRate = calculateHatchingRate(normalizedProfile.hatchingChicks, normalizedProfile.incubatedEggs);
      const updated = henProfiles.map(h => h.id === selectedHenId ? {
        ...normalizedProfile,
        photo: uploadedPhotoUrl || normalizedProfile.photo || '',
        hatchingRate,
        eggsIncubated: normalizedProfile.incubatedEggs,
        chicksHatched: normalizedProfile.hatchingChicks
      } : h);
      setHenProfiles(updated);
      saveHenProfiles(updated);
      setNewHenProfile(getDefaultHenProfile());
      setSelectedHenId(null);
      setProfilePhotoFile(null);
    } catch (error) {
      console.error('Profile photo upload failed:', error);
      setFormErrors((prev) => ({ ...prev, photo: 'Photo upload failed. Please try again.' }));
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const addBatchRecordToHenProfile = () => {
    const errors = {};
    if (!newHenProfile.batchId) errors.batchId = 'Batch is required';
    if (newHenProfile.eggsLaid < 0) errors.eggsLaid = 'Eggs laid must be positive';
    if (newHenProfile.incubatedEggs < 0) errors.incubatedEggs = 'Incubated eggs must be positive';
    if (newHenProfile.hatchingChicks < 0) errors.hatchingChicks = 'Hatching chicks must be positive';
    if (newHenProfile.hatchingChicks > newHenProfile.incubatedEggs) {
      errors.hatchingChicks = 'Hatching chicks cannot exceed incubated eggs';
    }
    if (newHenProfile.incubatedEggs > newHenProfile.eggsLaid) {
      errors.incubatedEggs = 'Incubated eggs cannot exceed eggs laid';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors((prev) => ({ ...prev, ...errors }));
      return;
    }

    const record = {
      id: Date.now(),
      batchId: Number(newHenProfile.batchId),
      eggsLaid: Number(newHenProfile.eggsLaid || 0),
      layingStartDate: newHenProfile.layingStartDate || '',
      incubatedEggs: Number(newHenProfile.incubatedEggs || 0),
      incubatedDate: newHenProfile.incubatedDate || '',
      hatchingChicks: Number(newHenProfile.hatchingChicks || 0),
      hatchingDate: newHenProfile.hatchingDate || '',
      hatchingRate: calculateHatchingRate(newHenProfile.hatchingChicks, newHenProfile.incubatedEggs)
    };

    const currentRecords = Array.isArray(newHenProfile.batchRecords) ? newHenProfile.batchRecords : [];
    const updatedRecords = [...currentRecords, record];
    const totals = updatedRecords.reduce((acc, item) => {
      acc.eggsLaid += Number(item.eggsLaid || 0);
      acc.incubatedEggs += Number(item.incubatedEggs || 0);
      acc.hatchingChicks += Number(item.hatchingChicks || 0);
      return acc;
    }, { eggsLaid: 0, incubatedEggs: 0, hatchingChicks: 0 });

    setNewHenProfile((prev) => ({
      ...prev,
      batchRecords: updatedRecords,
      eggsLaid: totals.eggsLaid,
      incubatedEggs: totals.incubatedEggs,
      hatchingChicks: totals.hatchingChicks,
      layingStartDate: '',
      incubatedDate: '',
      hatchingDate: ''
    }));
    setFormErrors((prev) => ({ ...prev, batchRecords: undefined }));
  };

  const removeBatchRecordFromHenProfile = (recordId) => {
    const currentRecords = Array.isArray(newHenProfile.batchRecords) ? newHenProfile.batchRecords : [];
    const removedRecord = currentRecords.find((record) => record.id === recordId);
    const updatedRecords = currentRecords.filter((record) => record.id !== recordId);
    const totals = updatedRecords.reduce((acc, item) => {
      acc.eggsLaid += Number(item.eggsLaid || 0);
      acc.incubatedEggs += Number(item.incubatedEggs || 0);
      acc.hatchingChicks += Number(item.hatchingChicks || 0);
      return acc;
    }, { eggsLaid: 0, incubatedEggs: 0, hatchingChicks: 0 });

    setNewHenProfile((prev) => ({
      ...prev,
      batchRecords: updatedRecords,
      eggsLaid: totals.eggsLaid,
      incubatedEggs: totals.incubatedEggs,
      hatchingChicks: totals.hatchingChicks
    }));

    const updatedProfiles = henProfiles.map((hen) => String(hen.id) === String(selectedHenId)
      ? {
        ...hen,
        batchRecords: updatedRecords,
        eggsLaid: totals.eggsLaid,
        incubatedEggs: totals.incubatedEggs,
        hatchingChicks: totals.hatchingChicks,
        hatchingRate: calculateHatchingRate(totals.hatchingChicks, totals.incubatedEggs)
      }
      : hen
    );
    setHenProfiles(updatedProfiles);
    saveHenProfiles(updatedProfiles);

    if (removedRecord) {
      const currentHenName = newHenProfile?.name || '';
      const batchTag = `(Batch ${Number(removedRecord.batchId || 0)})`;
      const cleanedRecords = poultryRecords.filter((record) => !(
        (
          record.source === 'batch-lock' &&
          String(record.henId || '') === String(selectedHenId) &&
          Number(record.batchId || 0) === Number(removedRecord.batchId || 0)
        ) ||
        (
          String(record.notes || '').trim() === String(currentHenName).trim() &&
          String(record.event || '').includes(batchTag)
        )
      ));
      setPoultryRecords(cleanedRecords);
      savePoultryRecords(cleanedRecords);
    }
  };
  
  // Batch management functions
  const addBatch = (name, rate) => {
    const newBatch = { id: Date.now(), name, hatchingRate: Number(rate) };
    setBatches([...batches, newBatch]);
  };
  
  const updateBatchRate = (id, rate) => {
    setBatches(batches.map(b => b.id === id ? { ...b, hatchingRate: Number(rate) } : b));
  };
  
  const deleteBatch = (id) => {
    setBatches(batches.filter(b => b.id !== id));
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

  // Event Ticker Component
  const EventTicker = () => {
    // Collect all events from three sources
    const allEvents = [];
    
    // 1. News & Updates
    newsItems.forEach(item => {
      if (item.date && item.title) {
        allEvents.push({
          date: item.date,
          text: `${item.title}: ${item.content}`
        });
      }
    });
    
    // 2. Poultry Records
    poultryRecords.forEach(record => {
      if (record.date && record.event) {
        const notesText = record.notes ? ` - ${record.notes}` : '';
        allEvents.push({
          date: record.date,
          text: `${record.event}${notesText}`
        });
      }
    });
    
    // 3. Garden Records
    gardenRecords.forEach(record => {
      if (record.planted && record.plant) {
        const varietyText = record.variety ? ` (${record.variety})` : '';
        allEvents.push({
          date: record.planted,
          text: `${record.plant}${varietyText} planted`
        });
      }
    });
    
    if (allEvents.length === 0) return null;
    
    // Group events by date and merge on same day
    const eventsByDate = {};
    allEvents.forEach(event => {
      const dateKey = event.date;
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });
    
    // Merge events by date
    const mergedEvents = Object.entries(eventsByDate).map(([date, events]) => {
      const texts = events.map(e => e.text);
      return { date, text: texts.join(', ') };
    });
    
    // Sort by date descending and take last 1
    const sortedEvents = mergedEvents
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 1);
    
    if (sortedEvents.length === 0) return null;
    
    // Build display text with | separator
    const displayText = sortedEvents.map(e => e.text).join(' | ');
    
    return (
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 text-white py-2 overflow-hidden">
        <div className="overflow-hidden whitespace-nowrap">
          <div className="inline-flex items-center animate-marquee">
            <span className="text-sm font-medium px-2 flex items-center shrink-0">
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-bold mr-2 shadow-sm">NEW</span>
              {displayText}
            </span>
          </div>
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          .animate-marquee {
            animation: marquee 15s linear infinite;
          }
        `}</style>
      </div>
    );
  };

  const allHenProfiles = henProfiles;
  const kodiProfiles = henProfiles.filter((hen) => (hen.gender || 'kodi') === 'kodi');
  const filteredHenProfiles = allHenProfiles.filter((hen) => (hen.gender || 'kodi') === selectedHenType);
  const selectedHenProfile = allHenProfiles.find((hen) => String(hen.id) === String(selectedHenId)) || null;

  const parseDateOnly = (dateValue) => {
    if (!dateValue) return null;
    const dateObj = new Date(dateValue);
    if (Number.isNaN(dateObj.getTime())) return null;
    return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  };

  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Aggregate flock stats from hen profiles and batch lifecycle dates
  const flockStats = allHenProfiles.reduce((acc, hen, idx) => {
    const gender = hen.gender || 'kodi';
    const hasValidSNo = hen.sNo !== '' && hen.sNo !== null && hen.sNo !== undefined;
    acc.totalHens += hasValidSNo ? 1 : (hen.id ? 1 : 0);
    if (gender === 'kodi') acc.femaleHens++;
    if (gender === 'punju') acc.maleHens++;
    if (gender === 'pilla') acc.chicks++;

    if (gender === 'kodi') {
      const batchRecords = Array.isArray(hen.batchRecords) ? hen.batchRecords : [];
      let isLayingNow = false;
      let isIncubatingNow = false;

      batchRecords.forEach((record) => {
        const layingStart = parseDateOnly(record.layingStartDate);
        const incubatedDate = parseDateOnly(record.incubatedDate);
        const hatchingDate = parseDateOnly(record.hatchingDate);

        const inLayingWindow = layingStart && layingStart <= todayOnly && (!incubatedDate || todayOnly < incubatedDate);
        const inIncubatingWindow = incubatedDate && incubatedDate <= todayOnly && (!hatchingDate || todayOnly < hatchingDate);
        const eggsLocked = Number(record.eggsLaid || 0);
        const incubatedEggs = Number(record.incubatedEggs || 0);

        if (inLayingWindow) {
          isLayingNow = true;
        }

        acc.totalEggsStock += Math.max(eggsLocked - incubatedEggs, 0);

        if (inIncubatingWindow) {
          isIncubatingNow = true;
        }

        acc.totalEggs += eggsLocked;
      });

      if (isLayingNow) acc.layingHens++;
      if (isIncubatingNow) acc.incubatingHens++;
    }

    // Keep S.No fallback stable when legacy rows miss IDs.
    if (!hasValidSNo && !hen.id) {
      acc.totalHens = Math.max(acc.totalHens, idx + 1);
    }

    return acc;
  }, { totalHens: 0, femaleHens: 0, maleHens: 0, chicks: 0, layingHens: 0, incubatingHens: 0, totalEggs: 0, totalEggsStock: 0 });

  // Build lifecycle-based recent records from hen profile batch input.
  const poultryLifecycleRecords = allHenProfiles.flatMap((hen) => {
    const batchRecords = Array.isArray(hen.batchRecords) ? hen.batchRecords : [];
    const henName = hen.name || 'Unnamed';

    return batchRecords.flatMap((record) => {
      const events = [];

      if (record.layingStartDate) {
        events.push({
          id: `${hen.id || henName}-${record.id}-laying`,
          date: record.layingStartDate,
          event: `Started laying eggs (Batch ${record.batchId})`,
          notes: henName
        });
      }

      if (record.incubatedDate) {
        events.push({
          id: `${hen.id || henName}-${record.id}-incubated`,
          date: record.incubatedDate,
          event: `Incubated ${record.incubatedEggs || 0} eggs (Batch ${record.batchId})`,
          notes: henName
        });
      }

      if (record.hatchingDate) {
        const rate = calculateHatchingRate(record.hatchingChicks || 0, record.incubatedEggs || 0);
        events.push({
          id: `${hen.id || henName}-${record.id}-hatched`,
          date: record.hatchingDate,
          event: `Hatched ${record.hatchingChicks || 0} chicks, hatching rate ${rate}% (Batch ${record.batchId})`,
          notes: henName
        });
      }

      return events;
    });
  });

  const recentPoultryRecords = [...poultryLifecycleRecords, ...poultryRecords]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-green-50 overflow-x-hidden">
      <header className="bg-gradient-to-r from-green-800 via-emerald-700 to-green-800 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6">
            <img src={titleLogo} alt="Farm Logo" className="h-16 md:h-24 mx-auto mb-3 md:mb-4 object-contain" />
            <nav className="flex flex-wrap justify-center gap-2 md:gap-4">
            <button
              onClick={() => setCurrentView('poultry')}
              className={`px-3 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base ${
                currentView === 'poultry' ? 'bg-white text-green-800 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              కోళ్లు
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

      <EventTicker />

      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-8">
        {currentView === 'poultry' && (
          <div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4 md:mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-amber-900 text-center md:text-left">కోళ్లు</h2>
              <button
                onClick={() => setCurrentView('profile')}
                className="w-full md:w-auto bg-white border-2 border-amber-200 shadow-md rounded-2xl px-5 py-3 text-amber-900 font-bold hover:bg-amber-50 transition-all"
              >
                Profile
              </button>
            </div>
            
            {/* Flock Statistics */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-6 rounded-2xl border-2 border-amber-200 shadow-lg mb-6">
              <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Flock Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-amber-200 text-center">
                  <div className="text-2xl font-bold text-amber-900">{flockStats.totalHens}</div>
                  <div className="text-sm text-amber-600">Total Hens</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200 text-center">
                  <div className="text-2xl font-bold text-amber-900">{flockStats.femaleHens}</div>
                  <div className="text-sm text-amber-600">Female</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200 text-center">
                  <div className="text-2xl font-bold text-amber-900">{flockStats.maleHens}</div>
                  <div className="text-sm text-amber-600">Male</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200 text-center">
                  <div className="text-2xl font-bold text-amber-900">{flockStats.chicks}</div>
                  <div className="text-sm text-amber-600">Chicks</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200 text-center">
                  <div className="text-2xl font-bold text-amber-900">{flockStats.layingHens}</div>
                  <div className="text-sm text-amber-600">Laying Hens</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200 text-center">
                  <div className="text-2xl font-bold text-amber-900">{flockStats.incubatingHens}</div>
                  <div className="text-sm text-amber-600">Incubating Hens</div>
                </div>
              </div>
            </div>
            
            {/* Egg Production Stats */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-6 rounded-2xl border-2 border-amber-200 shadow-lg mb-6">
              <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                <Egg className="w-5 h-5" />
                Egg Production
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-amber-200">
                  <div className="text-sm text-amber-600 mb-1">Total Eggs (Stock)</div>
                  <div className="text-3xl font-bold text-amber-900">{flockStats.totalEggsStock}</div>
                </div>
              </div>
            </div>
            

            
            {/* Recent Records */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border-2 border-amber-200 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-amber-900">Recent Records</h3>
                {recentPoultryRecords.length > 0 && (
                  <button
                    onClick={clearAllRecentRecords}
                    className="px-3 py-1.5 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Delete All
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-amber-200 bg-amber-50">
                      <th className="text-left py-3 px-4 font-semibold text-amber-900">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-amber-900">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-amber-900">Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPoultryRecords.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="py-8 text-center text-amber-600">
                          No records yet. Add poultry batch data from Admin panel.
                        </td>
                      </tr>
                    ) : (
                      recentPoultryRecords.map((record, idx) => (
                        <tr key={record.id} className={`border-b border-amber-100 hover:bg-amber-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}`}>
                          <td className="py-3 px-4 font-medium text-amber-900">
                            {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 text-amber-700">{record.notes || '-'}</td>
                          <td className="py-3 px-4 text-amber-800">{record.event}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {currentView === 'profile' && (
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-amber-900 mb-4 md:mb-6 text-center">Profile</h2>
            
            {/* Hen Profiles */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border-2 border-amber-200 shadow-lg mb-6">
              <h3 className="text-xl font-bold text-amber-900 mb-4">Hen Profiles</h3>

              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { value: 'kodi', label: 'కోడి' },
                  { value: 'punju', label: 'పుంజు' },
                  { value: 'pilla', label: 'పిల్ల' }
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => {
                      setSelectedHenType(tab.value);
                      setSelectedHenId(null);
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      selectedHenType === tab.value
                        ? 'bg-amber-700 text-white'
                        : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h4 className="text-lg font-bold text-amber-900 mb-3">{selectedHenType === 'kodi' ? 'కోడి' : selectedHenType === 'punju' ? 'పుంజు' : 'పిల్ల'} List</h4>
                  {filteredHenProfiles.length === 0 ? (
                    <p className="text-sm text-amber-700">No profiles in this category.</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredHenProfiles.map((hen) => (
                        <div key={hen.id} className="flex items-center justify-between bg-white border border-amber-200 rounded-lg px-3 py-2">
                          <span className="font-medium text-amber-900">{hen.name || 'Unnamed'}</span>
                          <button
                            onClick={() => {
                              setSelectedHenId(hen.id);
                              setCurrentView('hen-detail');
                            }}
                            className="text-sm bg-amber-600 text-white px-3 py-1 rounded-md hover:bg-amber-700"
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'garden' && (
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-emerald-900 mb-4 md:mb-6 text-center">చెట్లు</h2>
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <div className="bg-white p-4 md:p-6 rounded-2xl border-2 border-emerald-200 shadow-lg">
                <h3 className="text-lg md:text-xl font-bold text-emerald-900 mb-4 md:mb-6">Garden Records</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-emerald-200 bg-emerald-50">
                        <th className="text-left py-3 px-4 font-semibold text-emerald-900">Plant</th>
                        <th className="text-left py-3 px-4 font-semibold text-emerald-900">Variety</th>
                        <th className="text-left py-3 px-4 font-semibold text-emerald-900">Planted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gardenRecords.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="py-8 text-center text-emerald-600">
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

        {currentView === 'hen-detail' && (
          <div>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-amber-900">Hen Profile</h2>
              <button
                onClick={() => setCurrentView('profile')}
                className="bg-amber-100 text-amber-900 px-4 py-2 rounded-lg hover:bg-amber-200 font-semibold"
              >
                Back
              </button>
            </div>

            {selectedHenProfile ? (
              <HenProfile hen={selectedHenProfile} />
            ) : (
              <div className="h-full min-h-48 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center text-amber-700">
                Select a profile to view details.
              </div>
            )}
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

              <div className="bg-white p-3 md:p-4 rounded-xl border border-amber-200 mb-4">
                <h4 className="font-semibold text-amber-800 mb-3">Add birds</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-amber-700 mb-1 block">Name *</label>
                    <input
                      type="text"
                      placeholder="Name"
                      value={newHenProfile.name}
                      onChange={(e) => setNewHenProfile({ ...newHenProfile, name: e.target.value })}
                      className={`px-4 py-2 border-2 rounded-lg focus:ring-2 outline-none w-full ${formErrors.name ? 'border-red-500 focus:border-red-500' : 'border-amber-300 focus:border-amber-500'}`}
                    />
                    {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-amber-700 mb-1 block">DoB *</label>
                    <input
                      type="date"
                      value={newHenProfile.dob}
                      onChange={(e) => setNewHenProfile({ ...newHenProfile, dob: e.target.value })}
                      className={`px-4 py-2 border-2 rounded-lg focus:ring-2 outline-none w-full ${formErrors.dob ? 'border-red-500 focus:border-red-500' : 'border-amber-300 focus:border-amber-500'}`}
                    />
                    {formErrors.dob && <p className="text-xs text-red-500 mt-1">{formErrors.dob}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-amber-700 mb-1 block">Profile Picture</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="profile-photo-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const selectedFile = e.target.files?.[0] || null;
                          setProfilePhotoFile(selectedFile);
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="profile-photo-input"
                        className="px-4 py-2 border-2 border-amber-300 rounded-lg cursor-pointer hover:border-amber-500 bg-white text-amber-900 text-sm"
                      >
                        Choose
                      </label>
                      <span className="text-xs text-amber-700">
                        {profilePhotoFile ? 'Uploaded' : ''}
                      </span>
                    </div>
                    {formErrors.photo && <p className="text-xs text-red-500 mt-1">{formErrors.photo}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-amber-700 mb-1 block">Gender</label>
                    <select
                      value={newHenProfile.gender}
                      onChange={(e) => setNewHenProfile({ ...newHenProfile, gender: e.target.value })}
                      className="px-4 py-2 border-2 border-amber-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none w-full"
                    >
                      <option value="kodi">కోడి</option>
                      <option value="punju">పుంజు</option>
                      <option value="pilla">పిల్ల</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={addHenProfile}
                  disabled={isPhotoUploading}
                  className="w-full md:w-auto bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-2 rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all flex items-center justify-center gap-2 font-semibold shadow-md"
                >
                  <Plus className="w-5 h-5" /> {isPhotoUploading ? 'Uploading Photo...' : 'Add'}
                </button>
              </div>

              <div className="bg-white p-3 md:p-4 rounded-xl border border-amber-200 mb-4">
                <h4 className="font-semibold text-amber-800 mb-3">Update Poultry Data (కోడి only)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-amber-700 mb-1 block">Select కోడి Name</label>
                    <select
                      value={selectedHenId || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (!selectedId) {
                          setSelectedHenId(null);
                          setNewHenProfile(getDefaultHenProfile());
                          setBatchInput(getDefaultBatchInput());
                          setBatchLocks(getDefaultBatchLocks());
                          setBatchInfoMessage('');
                          setFormErrors({});
                          return;
                        }
                        updateHenProfile(selectedId);
                      }}
                      className="px-4 py-2 border-2 border-amber-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none w-full"
                    >
                      <option value="">Select</option>
                      {kodiProfiles.map((hen) => (
                        <option key={hen.id} value={hen.id}>{hen.name || 'Unnamed'}</option>
                      ))}
                    </select>
                    {formErrors.selectedHen && <p className="text-xs text-red-500 mt-1">{formErrors.selectedHen}</p>}
                  </div>
                </div>

                {selectedHenId && (
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-3">
                    <h5 className="font-semibold text-amber-800 mb-3">Batch Data (for కోడి)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-amber-700 mb-1 block">Batch Number</label>
                        <input
                          type="number"
                          min="1"
                          value={batchInput.batchId}
                          onChange={(e) => loadBatchIfExists(e.target.value)}
                          className="px-4 py-2 border-2 border-amber-300 rounded-lg focus:border-amber-500 focus:ring-2 outline-none w-full"
                        />
                        {formErrors.batchId && <p className="text-xs text-red-500 mt-1">{formErrors.batchId}</p>}
                        {batchInfoMessage && <p className="text-xs text-amber-700 mt-1">{batchInfoMessage}</p>}
                      </div>
                      <div>
                        <label className="text-xs text-amber-700 mb-1 block">Eggs (this batch)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={batchInput.eggsLaid}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
                            setBatchInput({ ...batchInput, eggsLaid: digitsOnly });
                          }}
                          disabled={batchLocks.eggs}
                          className={`px-4 py-2 border-2 rounded-lg focus:ring-2 outline-none w-full ${formErrors.eggsLaid ? 'border-red-500 focus:border-red-500' : 'border-amber-300 focus:border-amber-500'}`}
                        />
                        <div className="mt-1">
                          <input
                            type="checkbox"
                            checked={batchLocks.eggs}
                            onChange={() => lockBatchStage('eggs')}
                            disabled={batchLocks.eggs}
                            aria-label="Lock eggs"
                            className="w-6 h-6 accent-amber-700"
                          />
                        </div>
                        {formErrors.eggsLaid && <p className="text-xs text-red-500 mt-1">{formErrors.eggsLaid}</p>}
                      </div>
                      <div>
                        <label className="text-xs text-amber-700 mb-1 block">Start Date (Laying)</label>
                        <input
                          type="date"
                          value={batchInput.layingStartDate}
                          onChange={(e) => setBatchInput({ ...batchInput, layingStartDate: e.target.value })}
                          disabled={batchLocks.laying}
                          className="px-4 py-2 border-2 border-amber-300 rounded-lg focus:border-amber-500 focus:ring-2 outline-none w-full"
                        />
                        <div className="mt-1">
                          <input
                            type="checkbox"
                            checked={batchLocks.laying}
                            onChange={() => lockBatchStage('laying')}
                            disabled={batchLocks.laying}
                            aria-label="Lock laying date"
                            className="w-6 h-6 accent-amber-700"
                          />
                        </div>
                        {formErrors.layingStartDate && <p className="text-xs text-red-500 mt-1">{formErrors.layingStartDate}</p>}
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-amber-200 flex flex-col justify-center">
                        <span className="text-xs text-amber-700">Hatching Rate</span>
                        <span className="text-xl font-bold text-amber-900">
                          {calculateHatchingRate(batchInput.hatchingChicks, batchInput.incubatedEggs)}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-amber-700 mb-1 block">Incubated Eggs</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={batchInput.incubatedEggs}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
                            setBatchInput({ ...batchInput, incubatedEggs: digitsOnly });
                          }}
                          disabled={batchLocks.incubation}
                          className={`px-4 py-2 border-2 rounded-lg focus:ring-2 outline-none w-full ${formErrors.incubatedEggs ? 'border-red-500 focus:border-red-500' : 'border-amber-300 focus:border-amber-500'}`}
                        />
                        {formErrors.incubatedEggs && <p className="text-xs text-red-500 mt-1">{formErrors.incubatedEggs}</p>}
                      </div>
                      <div>
                        <label className="text-xs text-amber-700 mb-1 block">Incubated Date</label>
                        <input
                          type="date"
                          value={batchInput.incubatedDate}
                          onChange={(e) => setBatchInput({ ...batchInput, incubatedDate: e.target.value })}
                          disabled={batchLocks.incubation}
                          className="px-4 py-2 border-2 border-amber-300 rounded-lg focus:border-amber-500 focus:ring-2 outline-none w-full"
                        />
                        <div className="mt-1">
                          <input
                            type="checkbox"
                            checked={batchLocks.incubation}
                            onChange={() => lockBatchStage('incubation')}
                            disabled={batchLocks.incubation}
                            aria-label="Lock incubation"
                            className="w-6 h-6 accent-amber-700"
                          />
                        </div>
                        {formErrors.incubatedDate && <p className="text-xs text-red-500 mt-1">{formErrors.incubatedDate}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-amber-700 mb-1 block">Hatching Chicks</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={batchInput.hatchingChicks}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
                            setBatchInput({ ...batchInput, hatchingChicks: digitsOnly });
                          }}
                          disabled={batchLocks.hatching}
                          className={`px-4 py-2 border-2 rounded-lg focus:ring-2 outline-none w-full ${formErrors.hatchingChicks ? 'border-red-500 focus:border-red-500' : 'border-amber-300 focus:border-amber-500'}`}
                        />
                        {formErrors.hatchingChicks && <p className="text-xs text-red-500 mt-1">{formErrors.hatchingChicks}</p>}
                      </div>
                      <div>
                        <label className="text-xs text-amber-700 mb-1 block">Hatching Date</label>
                        <input
                          type="date"
                          value={batchInput.hatchingDate}
                          onChange={(e) => setBatchInput({ ...batchInput, hatchingDate: e.target.value })}
                          disabled={batchLocks.hatching}
                          className="px-4 py-2 border-2 border-amber-300 rounded-lg focus:border-amber-500 focus:ring-2 outline-none w-full"
                        />
                        <div className="mt-1">
                          <input
                            type="checkbox"
                            checked={batchLocks.hatching}
                            onChange={() => lockBatchStage('hatching')}
                            disabled={batchLocks.hatching}
                            aria-label="Lock hatching"
                            className="w-6 h-6 accent-amber-700"
                          />
                        </div>
                        {formErrors.hatchingDate && <p className="text-xs text-red-500 mt-1">{formErrors.hatchingDate}</p>}
                      </div>
                    </div>

                    {formErrors.batchLocks && <p className="text-xs text-red-500 mt-2">{formErrors.batchLocks}</p>}

                    <div className="mt-3 space-y-2">
                      {(newHenProfile.batchRecords || []).map((record) => (
                        <div key={record.id} className="bg-white border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3">
                          <div className="text-sm text-amber-900">
                            Batch {record.batchId} | Eggs {record.eggsLaid} | Incubated {record.incubatedEggs} | Hatched {record.hatchingChicks} | Rate {record.hatchingRate}%
                          </div>
                          <button
                            onClick={() => removeBatchRecordFromHenProfile(record.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-amber-100">
                    <tr>
                      <th className="px-2 py-2 text-left">S.No</th>
                      <th className="px-2 py-2 text-left">Name</th>
                      <th className="px-2 py-2 text-left">DoB</th>
                      <th className="px-2 py-2 text-left">Profile Picture</th>
                      <th className="px-2 py-2 text-left">Gender</th>
                      <th className="px-2 py-2 text-left">Batch Data</th>
                      <th className="px-2 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {henProfiles.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-6 text-center text-amber-700">No poultry profiles yet.</td>
                      </tr>
                    ) : (
                      henProfiles.map((hen, idx) => (
                        <tr key={hen.id} className={`border-b border-amber-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/40'}`}>
                          <td className="px-2 py-2">{hen.sNo || idx + 1}</td>
                          <td className="px-2 py-2 font-medium text-amber-900">{hen.name || '-'}</td>
                          <td className="px-2 py-2">{hen.dob ? new Date(hen.dob).toLocaleDateString('en-GB') : '-'}</td>
                          <td className="px-2 py-2">
                            {hen.photo ? (
                              <img src={hen.photo} alt={hen.name || 'hen'} className="w-10 h-10 rounded-md object-cover" />
                            ) : (
                              <span className="text-amber-700">-</span>
                            )}
                          </td>
                          <td className="px-2 py-2">{hen.gender === 'kodi' ? 'కోడి' : hen.gender === 'punju' ? 'పుంజు' : 'పిల్ల'}</td>
                          <td className="px-2 py-2">
                            {hen.gender !== 'kodi' ? (
                              <span>-</span>
                            ) : (
                              <div className="text-xs text-amber-800">
                                Batches: {(hen.batchRecords || []).length} | Eggs: {hen.eggsLaid || 0} | Incubated: {hen.incubatedEggs || 0} | Hatched: {hen.hatchingChicks || 0} | Rate: {calculateHatchingRate(hen.hatchingChicks || 0, hen.incubatedEggs || 0)}%
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => updateHenProfile(hen.id)}
                              className="text-amber-600 hover:text-amber-800 mr-3"
                              aria-label="Edit profile"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteHenProfile(hen.id)}
                              className="text-red-500 hover:text-red-700"
                              aria-label="Delete profile"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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
                </div>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3 mb-3">
                  <input
                    type="date"
                    value={newGardenRecord.planted}
                    onChange={(e) => setNewGardenRecord({ ...newGardenRecord, planted: e.target.value })}
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
                          {new Date(record.planted).toLocaleDateString()}
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