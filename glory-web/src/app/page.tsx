'use client';

import { useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import CraftingGrid from './components/CraftingGrid';

interface Material {
  id: string;
  name: string;
  description: string;
  level: number;
}


export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<{material: Material, quantity: number}[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [currentPage, setCurrentPage] = useState<'inventory' | 'crafting'>('inventory');

  const initializeUser = async (user: User) => {
    try {
      console.log('Initializing user:', user.uid);
      const token = await user.getIdToken();
      const response = await fetch('http://localhost:3001/api/init-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to initialize user:', errorText);
      } else {
        const data = await response.json();
        console.log('User initialized successfully:', data);
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? user.uid : 'signed out');
      setUser(user);
      setLoading(false);
      if (user) {
        // Always try to initialize user (will be no-op if already exists)
        console.log('User signed in, initializing...');
        await initializeUser(user);
        // Then load inventory
        await loadInventory();
      } else {
        setInventory([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const loadInventory = async () => {
    if (!user) return;
    
    setInventoryLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('http://localhost:3001/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInventory(data.inventory);
      } else {
        console.error('Failed to load inventory:', await response.text());
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setInventoryLoading(false);
    }
  };

  const addRandomMaterial = async () => {
    if (!user) return;
    
    try {
      const token = await user.getIdToken();
      const response = await fetch('http://localhost:3001/api/add-material', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Added material:', data.material.name);
        // Reload inventory to get updated quantities
        await loadInventory();
      } else {
        const errorData = await response.json();
        alert('Error adding material: ' + errorData.error);
      }
    } catch (error) {
      console.error('Error adding random material:', error);
      alert('Error adding material to inventory');
    }
  };

  const handleCraft = async (grid: (string | null)[][], weaponType: string) => {
    if (!user) return;
    
    try {
      const token = await user.getIdToken();
      const response = await fetch('http://localhost:3001/api/craft-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grid,
          weaponType
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Crafted weapon:', data.weapon);
        alert(`Successfully crafted: ${data.weapon.name}!\n${data.weapon.description}`);
        // Reload inventory to get updated quantities
        await loadInventory();
      } else {
        const errorData = await response.json();
        alert('Crafting failed: ' + errorData.error);
      }
    } catch (error) {
      console.error('Error crafting:', error);
      alert('Error during crafting');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center p-8 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
          <h1 className="text-4xl font-bold text-white mb-6">Glory Crafting</h1>
          <button
            onClick={signInWithGoogle}
            className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <header className="p-6 border-b border-white/20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-bold text-white">Glory Crafting</h1>
            <nav className="flex gap-4">
              <button
                onClick={() => setCurrentPage('inventory')}
                className={`px-4 py-2 rounded transition-colors ${
                  currentPage === 'inventory' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Inventory
              </button>
              <button
                onClick={() => setCurrentPage('crafting')}
                className={`px-4 py-2 rounded transition-colors ${
                  currentPage === 'crafting' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Crafting
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/80">Welcome, {user.displayName}</span>
            <button
              onClick={handleSignOut}
              className="text-white/80 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {currentPage === 'inventory' ? (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Your Inventory</h2>
              <button
                onClick={addRandomMaterial}
                disabled={inventoryLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Add Random Material
              </button>
            </div>

            {inventoryLoading ? (
              <div className="text-center text-white/80">Loading inventory...</div>
            ) : inventory.length === 0 ? (
              <div className="text-center text-white/80 bg-white/10 backdrop-blur-md rounded-lg p-8">
                <p className="text-xl mb-4">Your inventory is empty</p>
                <p>Click "Add Random Material" to get started!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {inventory.map((item, index) => (
                  <div
                    key={`${item.material.id}-${index}`}
                    className={`bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-colors cursor-pointer flex flex-col ${
                      selectedMaterial?.id === item.material.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedMaterial(
                      selectedMaterial?.id === item.material.id ? null : item.material
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-white">{item.material.name}</h3>
                      <div className="text-right">
                        <span className="text-yellow-400 font-semibold block">Lv.{item.material.level}</span>
                        <span className="text-white/60 text-sm">x{item.quantity}</span>
                      </div>
                    </div>
                    {selectedMaterial?.id === item.material.id && (
                      <p className="text-white/80 text-sm mt-2 pt-2 border-t border-white/20">
                        {item.material.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <CraftingGrid inventory={inventory} onCraft={handleCraft} />
        )}
      </main>
    </div>
  );
}