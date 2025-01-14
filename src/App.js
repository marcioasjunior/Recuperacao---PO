import React, { useState } from 'react';
import Plot from 'react-plotly.js';

function App() {
  const [variables, setVariables] = useState([{ name: '', coef: 0 }]);
  const [constraints, setConstraints] = useState([{ lhs: '', operator: '<=', rhs: 0 }]);
  const [objectiveType, setObjectiveType] = useState('maximize');
  const [objectiveFunction, setObjectiveFunction] = useState('');
  const [result, setResult] = useState(null);

  const isValidJson = (value) => {
    try {
      JSON.parse(value);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { variables, constraints, objectiveType, objectiveFunction };

    try {
      const response = await fetch('http://127.0.0.1:5000/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Erro ao se conectar com o backend:', error);
      alert('Houve um erro na comunicação com o backend!');
    }
  };

  // Gráfico
  const generatePlotData = () => {
    if (!result || !constraints.length) return [];

    const plotData = [];
    const feasibleRegion = []; 

    
    constraints.forEach((constraint, index) => {
      const lhs = constraint.lhs.replace(/\s+/g, '').split('+');
      const rhs = parseFloat(constraint.rhs);

      let coefX = 0, coefY = 0;

      lhs.forEach(term => {
        if (term.includes('x')) {
          coefX = parseFloat(term.replace('x', '').trim()) || 1;
        } else if (term.includes('y')) {
          coefY = parseFloat(term.replace('y', '').trim()) || 1;
        }
      });

      const x1 = 0;
      const y1 = rhs / coefY;

      const y2 = 0;
      const x2 = rhs / coefX;

      plotData.push({
        x: [x1, x2],
        y: [y1, y2],
        mode: 'lines',
        name: `Restrição ${index + 1}`,
      });

      feasibleRegion.push([x1, y1, x2, y2]);
    });

    if (result.solution) {
      const x = result.solution.x || 0;
      const y = result.solution.y || 0;

      plotData.push({
        x: [x],
        y: [y],
        mode: 'markers',
        marker: { color: 'red', size: 10 },
        name: 'Solução Ótima',
      });
    }

    return plotData;
  };

 
  const handleRemoveVariable = (index) => {
    const updatedVariables = variables.filter((_, i) => i !== index);
    setVariables(updatedVariables);
  };

  const handleRemoveConstraint = (index) => {
    const updatedConstraints = constraints.filter((_, i) => i !== index);
    setConstraints(updatedConstraints);
  };

  return (
    <div>
      <h1>Otimização</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <h2>|Variáveis de Decisão|</h2>
          {variables.map((variable, index) => (
            <div key={index}>
              <input
                type="text"
                placeholder="Nome"
                value={variable.name}
                onChange={(e) => {
                  const updated = [...variables];
                  updated[index].name = e.target.value;
                  setVariables(updated);
                }}
              />
              <input
                type="number"
                placeholder="Coeficiente"
                value={variable.coef}
                onChange={(e) => {
                  const updated = [...variables];
                  updated[index].coef = e.target.value;
                  setVariables(updated);
                }}
              />
              <button type="button" onClick={() => handleRemoveVariable(index)}>Excluir</button>
            </div>
          ))}
          <button type="button" onClick={() => setVariables([...variables, { name: '', coef: 0 }])}>
            Adicionar Variável
          </button>
        </div>

        <div>
          <h2>|Restrições|</h2>
          <h5>Utilizar "*" para separar multiplicadores das variáveis (Exemplo: 5*x + 2*y) </h5>
          {constraints.map((constraint, index) => (
            <div key={index}>
              <input
                type="text"
                placeholder="Digite aqui"
                value={constraint.lhs}
                onChange={(e) => {
                  const updated = [...constraints];
                  const lhsValue = e.target.value;
                  updated[index].lhs = isValidJson(lhsValue) ? JSON.parse(lhsValue) : lhsValue;
                  setConstraints(updated);
                }}
              />
              <select
                value={constraint.operator}
                onChange={(e) => {
                  const updated = [...constraints];
                  updated[index].operator = e.target.value;
                  setConstraints(updated);
                }}
              >
                <option value="<=">{'<='}</option>
                <option value=">=">{'>='}</option>
                <option value="=">{'='}</option>
              </select>
              <input
                type="number"
                placeholder="RHS"
                value={constraint.rhs}
                onChange={(e) => {
                  const updated = [...constraints];
                  updated[index].rhs = e.target.value;
                  setConstraints(updated);
                }}
              />
              <button type="button" onClick={() => handleRemoveConstraint(index)}>Excluir</button>
            </div>
          ))}
          <button type="button" onClick={() => setConstraints([...constraints, { lhs: '', operator: '<=', rhs: 0 }])}>
            Adicionar Restrição
          </button>
        </div>

        <div>
          <h2>|Objetivo da Função|</h2>
          <select value={objectiveType} onChange={(e) => setObjectiveType(e.target.value)}>
            <option value="maximize">Maximizar</option>
            <option value="minimize">Minimizar</option>
          </select>
        </div>
        <br /><br />
        <button type="submit">Resolver</button>
      </form>

      {result && (
        <div>
          <h2>Resultado da Otimização</h2>
          {result.status === 'Optimal' ? (
            <div>
              <p><strong>Status:</strong> Solução ótima encontrada para {objectiveType === 'maximize' ? 'maximizar' : 'minimizar'} o valor da função objetivo.</p>
              <p>
                <strong>Valor da Função Objetivo:</strong> 
                {result.objective_value !== undefined ? result.objective_value.toFixed(2) : 'Indisponível'}
              </p>
              <p><strong>Valores das Variáveis de Decisão:</strong></p>
              <ul>
                {result.solution ? (
                  Object.entries(result.solution).map(([name, value]) => (
                    <li key={name}>
                      <strong>{name}:</strong> {value !== undefined ? value.toFixed(2) : 'Indisponível'}
                    </li>
                  ))
                ) : (
                  <li>Dados das variáveis indisponíveis.</li>
                )}
              </ul>
            </div>
          ) : (
            <div>
              <p><strong>Status:</strong> {result.status || 'Indefinido'}</p>
              <p>
                <strong>Mensagem:</strong> Não foi possível encontrar uma solução viável com os parâmetros fornecidos. Verifique as restrições e tente novamente.
              </p>
            </div>
          )}

          <div style={{ marginTop: '40px' }}>
            <h3>Gráfico do Espaço de Soluções</h3>
            <Plot
              data={generatePlotData()}
              layout={{
                title: 'Espaço de Soluções',
                xaxis: { title: 'x' },
                yaxis: { title: 'y' },
                showlegend: true,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
