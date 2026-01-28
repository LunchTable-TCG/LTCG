/**
 * Top-level globalChat export for backward compatibility
 * Maintains flat API structure (api.globalChat.*) while code is organized in subdirectories
 */

export {
  getRecentMessages,
  getPaginatedMessages,
  getOnlineUsers,
  getMessageCount,
  sendMessage,
  updatePresence,
  sendSystemMessage,
} from "./social/globalChat";
