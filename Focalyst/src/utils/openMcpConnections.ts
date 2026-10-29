import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { MCP_CONNECTIONS_URL } from '../hooks/useMcpStatus';

/**
 * Opens the website's AI connections page in the in-app browser. The website handles sign-in
 * and returns there; nothing about the user goes in the URL. Resolves when the browser closes (iOS).
 */
export async function openMcpConnections(): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(MCP_CONNECTIONS_URL);
  } catch {
    await Linking.openURL(MCP_CONNECTIONS_URL).catch(() => {});
  }
}
