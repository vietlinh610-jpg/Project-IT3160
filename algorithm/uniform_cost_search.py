import heapq


def get_edge_cost(edge):
    if isinstance(edge, dict):
        return edge.get("time", edge.get("distance", 1))
    return edge


def get_edge_line(edge):
    if isinstance(edge, dict):
        return edge.get("line")
    return None


def uniform_cost_search(graph, start, goal):
    queue = [(0, start, [start], None)]
    visited = set()
    explored_nodes = []
    transfer_penalty = 5

    while queue:
        cost, current, path, current_line = heapq.heappop(queue)

        if current in visited:
            continue

        visited.add(current)
        explored_nodes.append(current)

        if current == goal:
            return path, explored_nodes, cost

        for neighbor, edge in graph.get(current, {}).items():
            if neighbor not in visited:
                edge_cost = get_edge_cost(edge)
                next_line = get_edge_line(edge)

                new_cost = cost + edge_cost

                if current_line is not None and next_line is not None:
                    if current_line != next_line:
                        new_cost += transfer_penalty

                heapq.heappush(
                    queue,
                    (new_cost, neighbor, path + [neighbor], next_line)
                )

    return None, explored_nodes, float("inf")