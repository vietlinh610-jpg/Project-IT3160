import heapq
from typing import Dict, List, Tuple, Optional, Set 

def get_edge_cost(edge):
    if isinstance(edge, dict):
        return edge.get("time", edge.get("distance", 1))
    return edge

def get_edge_line(edge):
    if isinstance(edge, dict):
        return edge.get("line")
    return None

def dijkstra(adj_list: Dict[int, Dict[int, any]], 
             source: int, 
             destination: int
             ) -> Tuple[Optional[List[int]], List[int], Optional[float]]:
    
    priority_queue: List[Tuple[float, int, Optional[str]]] = [(0.0, source, None)]
    distances: Dict[Tuple[int, Optional[str]], float] = {(source, None): 0.0}
    came_from: Dict[Tuple[int, Optional[str]], Optional[Tuple[int, Optional[str]]]] = { (source, None): None }
    explored_order: List[int] = []
    explored_nodes_set: Set[int] = set()
    visited_states: Set[Tuple[int, Optional[str]]] = set()
    
    transfer_penalty = 5
    
    while priority_queue:
        current_cost, current_node, previous_line = heapq.heappop(priority_queue)
    
        state = (current_node, previous_line)
        if state in visited_states:
            continue
        visited_states.add(state)   
    
        if current_node not in explored_nodes_set:
            explored_order.append(current_node)
            explored_nodes_set.add(current_node)
        
        if current_node == destination:
            path: List[int] = []
            temp_state: Optional[Tuple[int, Optional[str]]] = state
            while temp_state is not None:
                path.append(temp_state[0])
                temp_state = came_from.get(temp_state)
        
            if not path or path[-1] != source:
                if source == destination:
                    return [source], explored_order, 0.0
                return None, explored_order, None
        
            path.reverse()
            return path, explored_order, current_cost
        if current_node not in adj_list:
            continue
    
        for neighbor in adj_list[current_node]:
            edge = adj_list[current_node][neighbor]
            edge_cost = get_edge_cost(edge)
            current_line = get_edge_line(edge)
        
            penalty = 0.0
            if previous_line is not None and current_line is not None:
                if current_line != previous_line:
                    penalty = transfer_penalty
                
            next_cost = current_cost + edge_cost + penalty
            next_state = (neighbor, current_line)
            if next_cost < distances.get(next_state, float('inf')):
                distances[next_state] = next_cost
                came_from[next_state] = state
                heapq.heappush(priority_queue, (next_cost, neighbor, current_line))
    return None, explored_order, None
def priority_queue_pop_helper(pq):
    return heapq.heappop(pq) 
    