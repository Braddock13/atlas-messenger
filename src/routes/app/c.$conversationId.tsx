import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/atlas/chat-view";

export const Route = createFileRoute("/app/c/$conversationId")({
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = Route.useParams();
  return <ChatView conversationId={conversationId} />;
}
