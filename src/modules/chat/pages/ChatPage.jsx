import ModulePageLayout from '../../../components/ModulePageLayout';
import { chatData } from '../../../data/appData';
import './ChatPage.css';

export default function ChatPage() {
  return (
    <div className="chat-page">
      <ModulePageLayout {...chatData} />
    </div>
  );
}