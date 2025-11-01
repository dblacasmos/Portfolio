// Tipos mínimos para React 19 cuando no existen @types/react-dom

declare module 'react-dom' {
    export function createPortal(
        children: import('react').ReactNode,
        container: Element | DocumentFragment,
        key?: null | string
    ): import('react').ReactPortal;
}

declare module 'react-dom/client' {
    export type Root = {
        render(children: import('react').ReactNode): void;
        unmount(): void;
    };

    export function createRoot(
        container: Element | Document | DocumentFragment,
        options?: {
            onRecoverableError?: (error: unknown) => void;
            identifierPrefix?: string;
        }
    ): Root;
}
