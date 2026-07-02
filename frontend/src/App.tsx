import { useRouter } from './handlers/useRouter';
import { CreateLinkPage } from './pages/CreateLinkPage';
import { RoomPage } from './pages/RoomPage';

function App() {
  const { page, linkId, navigate } = useRouter();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background glow effects */}
      <div className="bg-gradient-glow top-1/4 left-1/4 animate-pulse-glow" style={{ animationDelay: '0s' }}></div>
      <div className="bg-gradient-glow bottom-1/4 right-1/4 animate-pulse-glow" style={{ animationDelay: '4s' }}></div>

      {/* Main Content Area */}
      {page === 'create' ? (
        <CreateLinkPage />
      ) : (
        <RoomPage linkId={linkId!} onGoBack={() => navigate('/')} />
      )}

      {/* Modern Compact Footer */}
      {page === 'create' && (
        <footer className="w-full py-6 text-center text-xs text-text border-t border-border mt-auto backdrop-blur-sm bg-card/10">
          <p>© {new Date().getFullYear()} Paul John Sopranes - Conferrence room MVP</p>
        </footer>
      )}
    </div>
  );
}

export default App;
