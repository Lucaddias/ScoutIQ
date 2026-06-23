import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import PlayerModal from '../components/PlayerModal.jsx';

// ---------------------------------------------------------------------------
// Testes do PlayerModal — cobrem robustez de UX e acessibilidade (Frente 2)
// e as barras de estatística relativas ao pool (Frente 5).
// ---------------------------------------------------------------------------

const basePlayer = {
  id: 'p1', name: 'Fulano Teste', position: 'Forward', team: 'Clube X', age: 25,
  marketValue: 10_000_000, monthlySalary: 50_000, score: 72,
  statistics: {
    goals: 15, assists: 6, totalPasses: 500, accuratePasses: 400,
    tackles: 20, interceptions: 8, distanceCoveredKm: 10,
    yellowCards: 3, redCards: 0, gamesPlayed: 30, minutesPlayed: 2500,
  },
  // Teto da posição (melhor da posição) — vem de enrichPlayers.
  statRefs: { goals: 30, assists: 12, tackles: 40, interceptions: 16, distanceCoveredKm: 12 },
  radar: { gols: 80, assist: 50, passe: 60, defesa: 40, distancia: 70 },
};

afterEach(() => cleanup());

describe('PlayerModal — acessibilidade e fechamento', () => {
  it('expõe role=dialog, aria-modal e título associado', () => {
    render(<PlayerModal player={basePlayer} onClose={() => {}} />);
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('modal-player-name');
    expect(document.getElementById('modal-player-name').textContent).toBe('Fulano Teste');
  });

  it('fecha com a tecla Esc', () => {
    const onClose = vi.fn();
    render(<PlayerModal player={basePlayer} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('player null não renderiza nada', () => {
    const { container } = render(<PlayerModal player={null} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('PlayerModal — barras relativas ao pool (Frente 5)', () => {
  it('largura da barra de Gols usa o teto da posição (15/30 = 50%)', () => {
    render(<PlayerModal player={basePlayer} onClose={() => {}} />);
    // Gols é a primeira barra de estatística do corpo do modal.
    const fill = document.querySelectorAll('.msb-fill')[0];
    expect(fill.style.width).toBe('50%');
  });
});

describe('PlayerModal — edição de stat com erro visível (Frente 2)', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('mostra mensagem de erro e mantém o modo de edição quando o save falha', async () => {
    const onStatEdit = vi.fn().mockRejectedValue(new Error('boom'));
    render(<PlayerModal player={basePlayer} onClose={() => {}} isAdmin onStatEdit={onStatEdit} />);

    fireEvent.click(screen.getByLabelText('Editar Gols'));
    const input = screen.getByLabelText('Novo valor de Gols');
    fireEvent.change(input, { target: { value: '18' } });
    fireEvent.click(screen.getByLabelText('Salvar Gols'));

    // O erro aparece (role=alert) e o input continua visível para nova tentativa.
    expect(await screen.findByText('Falha ao salvar. Tente novamente.')).toBeInTheDocument();
    expect(screen.getByLabelText('Novo valor de Gols')).toBeInTheDocument();
    // O modal injeta o player como 1º argumento: (player, statKey, novoValor, valorAntigo).
    expect(onStatEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1' }), 'goals', '18', 15,
    );
  });
});
