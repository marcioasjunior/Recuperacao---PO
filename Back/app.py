from flask import Flask, request, jsonify
import pulp
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/optimize', methods=['POST'])
def optimize():
    try:
        data = request.json
        print("Payload recebido no backend:", data)

        variables = data.get('variables', [])
        constraints = data.get('constraints', [])
        objective_type = data.get('objectiveType', 'maximize')

        prob = pulp.LpProblem(
            "Optimization",
            pulp.LpMaximize if objective_type == "maximize" else pulp.LpMinimize
        )

        decision_vars = {
            var['name']: pulp.LpVariable(var['name'], lowBound=0)
            for var in variables
        }

        prob += pulp.lpSum(
            [float(var['coef']) * decision_vars[var['name']] for var in variables]
        ), "Objective"

        for constraint in constraints:
            lhs_expr = constraint['lhs']
            for var_name in decision_vars.keys():
                lhs_expr = lhs_expr.replace(var_name, f"decision_vars['{var_name}']")
            
            lhs = eval(lhs_expr)
            operator = constraint['operator']
            rhs = float(constraint['rhs'])

            if operator == "<=":
                prob += lhs <= rhs
            elif operator == ">=":
                prob += lhs >= rhs
            elif operator == "=":
                prob += lhs == rhs

        prob.solve()

        solution = {var.name: int(var.varValue) for var in prob.variables()}  
        objective_value = int(pulp.value(prob.objective)) 
        status = pulp.LpStatus[prob.status]

        return jsonify(
            solution=solution,
            objective_value=objective_value,
            status=status
        )

    except Exception as e:
        print("Erro no backend:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)

