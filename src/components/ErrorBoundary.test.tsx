import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function Bomb(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('affiche ses enfants normalement quand rien ne plante', () => {
    render(
      <ErrorBoundary>
        <p>Tout va bien</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('Tout va bien')).toBeInTheDocument();
  });

  it('affiche le message de secours au lieu de faire planter toute la page', () => {
    // React logge l'erreur dans la console en dev — on la masque pour ce test précis.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary fallbackTitle="Titre de secours" fallbackMessage="Message de secours">
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText('Titre de secours')).toBeInTheDocument();
    expect(screen.getByText('Message de secours')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('utilise un message par défaut si aucun n\'est fourni', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText('Un problème est survenu')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
