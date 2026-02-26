import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import ChatScreen from './screens/ChatScreen';
import AIProfileScreen from './screens/AIProfileScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import MemoryScreen from './screens/MemoryScreen';
import GalleryScreen from './screens/GalleryScreen';
import ImageGeneratorScreen from './screens/ImageGeneratorScreen';
import JournalScreen from './screens/JournalScreen';
import SettingsScreen from './screens/SettingsScreen';

const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<ChatScreen />} />
            <Route path="/chat" element={<ChatScreen />} />
            <Route path="/ai-profile" element={<AIProfileScreen />} />
            <Route path="/user-profile" element={<UserProfileScreen />} />
            <Route path="/memory" element={<MemoryScreen />} />
            <Route path="/gallery" element={<GalleryScreen />} />
            <Route path="/image-generator" element={<ImageGeneratorScreen />} />
            <Route path="/journal" element={<JournalScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
