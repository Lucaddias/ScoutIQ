import React, { useMemo } from 'react';
import { useAtletas } from '../../hooks/useAtletas.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Inicio.css';

// Mapeamento de posições para português amigável
const POS_MAP = {
  Forward: 'Ataque',
  Midfielder: 'Meio-Campo',
  Defender: 'Defesa',
  Goalkeeper: 'Goleiro',
};

// Custom Tooltip component para o Dark Theme
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#0b0b24',
        border: '1px solid #1f1f4d',
        padding: '10px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#94a3b8' }}>{label}</p>
        <p style={{ margin: 0 }}>
          <span style={{ color: payload[0].fill, marginRight: '6px' }}>●</span>
          {`${payload[0].value} Gols`}
        </p>
      </div>
    );
  }
  return null;
};

const Inicio = () => {
  const { atletas, loading } = useAtletas();

  // Aggregation logic para os Gols por Posição
  const chartData = useMemo(() => {
    if (!atletas || atletas.length === 0) return [];

    const grouped = atletas.reduce((acc, atleta) => {
      const pos = POS_MAP[atleta.position] || 'Outro';
      const gols = atleta.statistics?.goals || 0;
      
      if (!acc[pos]) {
        acc[pos] = 0;
      }
      acc[pos] += gols;
      return acc;
    }, {});

    // Converter para array para o Recharts
    const data = Object.keys(grouped).map(key => ({
      name: key,
      gols: grouped[key]
    }));

    // Ordenar do maior para o menor para ficar mais elegante
    return data.sort((a, b) => b.gols - a.gols);
  }, [atletas]);

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
          <h3><i className="fa-solid fa-chart-pie"></i> Mapa de Eficiência: Impacto Ofensivo por Setor</h3>
          <div className="chart-placeholder" style={{ background: 'transparent', border: 'none', height: '300px', display: 'block', padding: 0 }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7a99" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7a99" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="gols" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            ) : loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#6b7a99' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Carregando dados...
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#6b7a99' }}>
                <i className="fa-solid fa-chart-simple" style={{ marginRight: '8px' }}></i> Sem dados de atletas para exibir.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inicio;
