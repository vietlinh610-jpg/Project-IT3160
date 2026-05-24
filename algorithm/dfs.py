from typing import Dict, List, Tuple, Optional, Set

def get_edge_cost(edge):
    if isinstance(edge, dict):
        return edge.get("time", edge.get("distance", 1))
    return edge

def get_edge_line(edge):
    if isinstance(edge, dict):
        return edge.get("line")
    return None

def dfs(adj_list: Dict[int, Dict[int, any]],
        source: int,
        destination: int
        ) -> Tuple[Optional[List[int]], List[int], Optional[float]]:

    stack: List[Tuple[int, Optional[str], float, List[int]]] = [(source, None, 0.0, [source])]

    explored_order: List[int] = []
    explored_nodes_set: Set[int] = set()
    
    visited_states: Set[Tuple[int, Optional[str]]] = set()
    
    transfer_penalty = 5

    while stack:
        current_node, previous_line, current_cost, path_to_current = stack.pop()

        state = (current_node, previous_line)
        if state in visited_states:
            continue
        visited_states.add(state)

        if current_node not in explored_nodes_set:
            explored_order.append(current_node)
            explored_nodes_set.add(current_node)

        if current_node == destination:
            return path_to_current, explored_order, current_cost

        if current_node not in adj_list:
            continue

        sorted_neighbors = sorted(list(adj_list[current_node].keys()), reverse=True)
        for neighbor in sorted_neighbors:
            if neighbor not in path_to_current:
                edge = adj_list[current_node][neighbor]
                edge_cost = get_edge_cost(edge)
                current_line = get_edge_line(edge)
                
                penalty = 0.0
                if previous_line is not None and current_line is not None:
                    if current_line != previous_line:
                        penalty = transfer_penalty
                
                next_cost = current_cost + edge_cost + penalty
                new_path = list(path_to_current)
                new_path.append(neighbor)
                
                stack.append((neighbor, current_line, next_cost, new_path))

    return None, explored_order, None


