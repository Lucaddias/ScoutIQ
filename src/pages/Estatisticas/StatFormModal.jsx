import React from 'react';
import { STAT_LABELS } from '../../utils/constants.js';
import { positionFullLabel } from '../../utils/formatters.js';

export default function StatFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingRecord,
  formData,
  setFormData,
  handleFormChange,
  bulkEntries,
  addBulkEntry,
  updateBulkEntry,
  removeBulkEntry,
  bulkData,
  setBulkData,
  saving,
  formError,

  playerFieldRef,
  playerSearch,
  setPlayerSearch,
  playerDropdownOpen,
  setPlayerDropdownOpen,
  filteredPlayers,
  selectPlayer,
  statKeys
}) {
  if (!isOpen) return null;

  return (
    <div className="crud-modal-overlay" onClick={onClose}>
      <div className="crud-modal" onClick={e => e.stopPropagation()}>
        <div className="crud-modal-header">
          <h3>
            <i className={`fa-solid ${editingRecord ? 'fa-pen-to-square' : 'fa-plus-circle'}`}></i>
            {editingRecord ? 'Editar Estatística' : 'Nova Estatística'}
          </h3>
          <button className="crud-modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={onSubmit} className="crud-modal-form">
          {formError && <div className="crud-form-error" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', fontWeight: 500 }}>{formError}</div>}
          
          <div className="crud-field" ref={playerFieldRef}>
            <label htmlFor="campo-jogador">Jogador</label>
            <div className="player-search-wrapper">
              <input
                id="campo-jogador"
                type="text"
                autoComplete="off"
                required
                placeholder="Buscar jogador por nome ou clube..."
                value={playerSearch}
                onChange={e => {
                  setPlayerSearch(e.target.value);
                  setPlayerDropdownOpen(true);
                  if (formData.jogador && e.target.value !== formData.jogador) {
                    setFormData(prev => ({ ...prev, jogadorId: '', jogador: '', jogadorImg: '', jogadorTeam: '' }));
                  }
                }}
                onFocus={() => setPlayerDropdownOpen(true)}
              />
              {formData.jogadorId && (
                <div className="player-selected-chip">
                  <img
                    src={formData.jogadorImg}
                    alt=""
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <span>{formData.jogador}</span>
                  <span className="player-chip-team">· {formData.jogadorTeam}</span>
                  <button
                    type="button"
                    className="player-chip-clear"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, jogadorId: '', jogador: '', jogadorImg: '', jogadorTeam: '' }));
                      setPlayerSearch('');
                    }}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              )}
              {playerDropdownOpen && !formData.jogadorId && (
                <div className="player-dropdown">
                  {filteredPlayers.length === 0 ? (
                    <div className="player-dropdown-empty">
                      <i className="fa-solid fa-magnifying-glass"></i>
                      Nenhum jogador encontrado
                    </div>
                  ) : (
                    filteredPlayers.map(p => (
                      <div key={p.id} className="player-dropdown-item" onClick={() => selectPlayer(p)}>
                        <img
                          src={p.profileImageURL}
                          alt={p.name}
                          className="player-dropdown-avatar"
                          onError={e => {
                            e.target.onerror = null;
                            e.target.src = '';
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                        <div className="player-dropdown-fallback" style={{ display: 'none' }}>
                          {p.name[0]}
                        </div>
                        <div className="player-dropdown-info">
                          <span className="player-dropdown-name">{p.name}</span>
                          <span className="player-dropdown-meta">
                            {p.team}
                            {p.position && <> · {positionFullLabel(p.position)}</>}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <input type="hidden" name="jogadorId" value={formData.jogadorId} required />
          </div>

          {editingRecord ? (
            <>
              <div className="crud-field">
                <label htmlFor="campo-tipo-estatistica">Tipo de Estatística</label>
                <select
                  id="campo-tipo-estatistica"
                  required
                  value={formData.tipoEstatistica}
                  onChange={e => handleFormChange('tipoEstatistica', e.target.value)}
                >
                  {statKeys.map(key => (
                    <option key={key} value={key}>{STAT_LABELS[key] || key}</option>
                  ))}
                </select>
              </div>

              <div className="crud-field">
                <label htmlFor="campo-valor">Valor</label>
                <input
                  id="campo-valor"
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="Ex: 12"
                  value={formData.valor}
                  onChange={e => handleFormChange('valor', e.target.value)}
                />
              </div>

              <div className="crud-field">
                <label htmlFor="campo-data">Data</label>
                <input
                  id="campo-data"
                  type="date"
                  required
                  value={formData.data}
                  onChange={e => handleFormChange('data', e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="bulk-entries-section">
                <label className="bulk-section-label">
                  <i className="fa-solid fa-layer-group"></i>
                  Estatísticas ({bulkEntries.length})
                </label>

                {bulkEntries.map((entry, idx) => (
                  <div className="bulk-entry-row" key={idx}>
                    <select
                      value={entry.tipoEstatistica}
                      onChange={e => updateBulkEntry(idx, 'tipoEstatistica', e.target.value)}
                      className="bulk-select"
                    >
                      {statKeys.map(key => (
                        <option key={key} value={key}>{STAT_LABELS[key] || key}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Valor"
                      value={entry.valor}
                      onChange={e => updateBulkEntry(idx, 'valor', e.target.value)}
                      className="bulk-input"
                      required
                    />
                    {bulkEntries.length > 1 && (
                      <button
                        type="button"
                        className="bulk-remove-btn"
                        onClick={() => removeBulkEntry(idx)}
                        title="Remover linha"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                  </div>
                ))}

                <button type="button" className="bulk-add-btn" onClick={addBulkEntry}>
                  <i className="fa-solid fa-plus"></i>
                  Adicionar outra estatística
                </button>
              </div>

              <div className="crud-field">
                <label htmlFor="campo-data-bulk">Data</label>
                <input
                  id="campo-data-bulk"
                  type="date"
                  required
                  value={bulkData}
                  onChange={e => setBulkData(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="crud-modal-actions">
            <button type="submit" className="crud-btn crud-btn-save" disabled={saving}>
              {saving ? (
                <><i className="fa-solid fa-spinner fa-spin"></i> Salvando...</>
              ) : editingRecord ? (
                <><i className="fa-solid fa-check"></i> Salvar Alterações</>
              ) : (
                <><i className="fa-solid fa-paper-plane"></i> Enviar Tudo ({bulkEntries.length})</>
              )}
            </button>
            <button type="button" className="crud-btn crud-btn-cancel" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
