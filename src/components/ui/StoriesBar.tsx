import { useEffect, useState } from 'react';
import api from '../../services/api.ts';
import { Plus, X } from 'lucide-react';
import ImageUpload from '../ui/ImageUpload';
import { useAuth } from '../../contexts/AuthContext';

export default function StoriesBar() {
  const { user } = useAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [viewingStory, setViewingStory] = useState<any | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const { data } = await api.get('/stories');
      // Agrupar por usuário
      const grouped = data.reduce((acc: any, story: any) => {
        if (!acc[story.user_id]) {
          acc[story.user_id] = {
            user_id: story.user_id,
            username: story.username,
            user_photo: story.user_photo,
            items: []
          };
        }
        acc[story.user_id].items.push(story);
        return acc;
      }, {});
      setStories(Object.values(grouped));
    } catch (error) {
      console.error('Erro ao buscar stories', error);
    }
  };

  const handleUpload = async (url: string) => {
    try {
      await api.post('/stories', { media_url: url, media_type: 'image' });
      setShowUpload(false);
      fetchStories();
    } catch (error) {
      alert('Erro ao postar story');
    }
  };

  return (
    <div className="mb-8 overflow-x-auto pb-4">
      <div className="flex gap-4">
        {/* Add Story Button (Streamer Only) */}
        {user?.role === 'streamer' && (
          <div className="flex flex-col items-center gap-2 min-w-[72px]">
            <button 
              onClick={() => setShowUpload(true)}
              className="w-16 h-16 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center bg-dark-800 hover:bg-dark-700 transition-colors"
            >
              <Plus className="text-primary-500" />
            </button>
            <span className="text-xs text-gray-400">Novo Story</span>
          </div>
        )}

        {/* Stories List */}
        {stories.map((group: any) => (
          <div 
            key={group.user_id} 
            className="flex flex-col items-center gap-2 cursor-pointer min-w-[72px]"
            onClick={() => setViewingStory(group)}
          >
            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-primary-600">
              <img 
                src={group.user_photo || `https://ui-avatars.com/api/?name=${group.username}`} 
                alt={group.username}
                className="w-full h-full rounded-full object-cover border-2 border-dark-900"
              />
            </div>
            <span className="text-xs text-gray-300 truncate max-w-[72px]">{group.username}</span>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-dark-800 p-6 rounded-xl w-full max-w-sm relative">
            <button 
              onClick={() => setShowUpload(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Novo Story</h3>
            <div className="h-64">
              <ImageUpload 
                type="story" 
                onUpload={handleUpload} 
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Viewer Modal */}
      {viewingStory && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <button 
            onClick={() => setViewingStory(null)}
            className="absolute top-4 right-4 z-50 text-white hover:text-gray-300"
          >
            <X className="h-8 w-8" />
          </button>
          
          <div className="w-full max-w-md aspect-[9/16] bg-dark-900 relative rounded-lg overflow-hidden">
             {/* Progress Bar (Simulada) */}
             <div className="absolute top-2 left-2 right-2 flex gap-1">
               {viewingStory.items.map((_: any, i: number) => (
                 <div key={i} className="h-1 bg-white/30 flex-1 rounded-full overflow-hidden">
                   <div className={`h-full bg-white ${i === 0 ? 'w-full' : 'w-0'}`}></div>
                 </div>
               ))}
             </div>

             {/* Header */}
             <div className="absolute top-6 left-4 flex items-center gap-3">
               <img src={viewingStory.user_photo} className="w-8 h-8 rounded-full border border-white" />
               <span className="text-white font-bold text-sm shadow-black drop-shadow-md">{viewingStory.username}</span>
             </div>

             {/* Content */}
             <img 
               src={viewingStory.items[0].media_url} 
               className="w-full h-full object-cover"
             />
          </div>
        </div>
      )}
    </div>
  );
}
