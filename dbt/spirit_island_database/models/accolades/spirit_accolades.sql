WITH 
spirit_game_data_raw AS (
    select distinct
        gf.game_id,
        gf.game_score,
        sd.spirit_name
    from {{ source('main', 'games_fact') }} gf
    left join {{ source('main', 'events_fact') }} ef
        on ef.game_id = gf.game_id
    left join {{ source('main', 'spirits_dim') }} sd
        on sd.spirit_id = ef.spirit_id
),
spirit_game_data_agg AS (
    select
        spirit_name,
        AVG(game_score) AS avg_game_score
    from spirit_game_data_raw
    group by spirit_name
),
mvp AS (
select
    'MVP' AS accolade_name,
    'highest average score' AS accolade_description,
    spirit_name
from spirit_game_data_agg
where avg_game_score = (SELECT MAX(avg_game_score) FROM spirit_game_data_agg)
order by spirit_name
limit 1
),
dq AS (
select
    'team playern`t' AS accolade_name,
    'lowest average score' AS accolade_description,
    spirit_name
from spirit_game_data_agg
where avg_game_score = (SELECT MIN(avg_game_score) FROM spirit_game_data_agg)
order by spirit_name
limit 1
)
SELECT * from mvp
union all
select * from dq