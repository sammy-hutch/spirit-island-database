-- model to calculate average score against each adversary for each spirit

SELECT
    e.spirit_id,
    e.adversary_id,
    AVG(g.game_score)
FROM events_fact AS e
INNER JOIN games_fact AS g
    ON e.game_id = g.game_id
GROUP BY 
    1,2