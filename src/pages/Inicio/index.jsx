import React from 'react';
import './Inicio.css';

const Inicio = () => {
  return (
    <div className="inicio-page">
      <div className="inicio-header">
        <div>
          <h1>Visão Geral da Liga</h1>
          <p>Estatísticas simuladas gerais do campeonato atual.</p>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon"><i className="fa-solid fa-futbol"></i></div>
          <div className="stat-info">
            <span>Total de Gols na Rodada</span>
            <strong>24</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fa-solid fa-bullseye"></i></div>
          <div className="stat-info">
            <span>Média de Gols/Jogo</span>
            <strong>2.4</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fa-solid fa-shield-cat"></i></div>
          <div className="stat-info">
            <span>Líder de Desarmes</span>
            <strong>André (FLU) - 45</strong>
          </div>
        </div>
      </div>

      <div className="inicio-grid">
        <div className="card">
          <h3><i className="fa-solid fa-medal"></i> Artilheiros do Campeonato</h3>
          <div className="table-wrapper">
            <table className="inicio-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Clube</th>
                  <th>Gols</th>
                  <th>Partidas</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Germán Cano</td><td>Fluminense</td><td>12</td><td>14</td></tr>
                <tr><td>Pedro</td><td>Flamengo</td><td>11</td><td>13</td></tr>
                <tr><td>Tiquinho Soares</td><td>Botafogo</td><td>10</td><td>15</td></tr>
                <tr><td>Vitor Roque</td><td>Athletico-PR</td><td>9</td><td>14</td></tr>
                <tr><td>Calleri</td><td>São Paulo</td><td>8</td><td>12</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3><i className="fa-solid fa-handshake-angle"></i> Maiores Assistentes</h3>
          <div className="table-wrapper">
            <table className="inicio-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Clube</th>
                  <th>Assistências</th>
                  <th>Partidas</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Jhon Arias</td><td>Fluminense</td><td>8</td><td>15</td></tr>
                <tr><td>Arrascaeta</td><td>Flamengo</td><td>7</td><td>12</td></tr>
                <tr><td>Raphael Veiga</td><td>Palmeiras</td><td>6</td><td>14</td></tr>
                <tr><td>Everton Ribeiro</td><td>Bahia</td><td>5</td><td>15</td></tr>
                <tr><td>Ganso</td><td>Fluminense</td><td>5</td><td>14</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card full-width">
          <h3><i className="fa-solid fa-chart-pie"></i> Distribuição de Gols por Posição</h3>
          <div className="chart-placeholder">
            <i className="fa-solid fa-chart-column" style={{ fontSize: '48px', color: '#334155' }}></i>
            <p>Gráfico interativo: Atacantes (65%), Meias (25%), Zagueiros (10%)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inicio;
