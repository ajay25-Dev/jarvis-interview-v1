declare module 'react-syntax-highlighter' {
  import type { ComponentType } from 'react';
  const SyntaxHighlighter: ComponentType<Record<string, unknown>>;
  export default SyntaxHighlighter;
}

declare module 'react-syntax-highlighter/dist/esm/styles/hljs' {
  const styles: Record<string, Record<string, unknown>>;
  export { styles as atomOneDark };
}
