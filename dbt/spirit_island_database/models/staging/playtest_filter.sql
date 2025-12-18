
WITH 
custom_spirits AS (
    SELECT distinct spirit_id
    FROM {{ source('main', 'spirits_dim') }}
    WHERE LOWER(spirit_name) LIKE '%custom%'
)
SELECT distinct game_id
FROM {{ source('main', 'events_fact') }}
WHERE spirit_id IN (SELECT * FROM custom_spirits)
