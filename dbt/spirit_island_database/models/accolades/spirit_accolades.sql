{% set accolades = load_seed('accolades') %}
{% for accolade in accolades %}
    '{{accolade.id}} AS id'
    '{{accolade.abbreviation}} AS abreviation'
    '{{accolade.name}} AS name'
    '{{accolade['type']}} AS type'
    '{{accolade['condition']}} AS condition'
{% endfor %}

WITH 
spirit_game_data_raw AS (
    select distinct
        gf.game_id,
        gf.game_score,
        gf.game_win,
        sd.spirit_name
    from {{ source('main', 'games_fact') }} gf
    left join {{ source('main', 'events_fact') }} ef
        on ef.game_id = gf.game_id
    left join {{ source('main', 'spirits_dim') }} sd
        on sd.spirit_id = ef.spirit_id
    where LOWER(sd.spirit_name) NOT LIKE '%custom%'
)
,
spirit_game_data_agg AS (
    select
        spirit_name,
        AVG(game_score) AS avg_game_score,
        AVG(IIF(game_win = 10, game_score, null)) AS avg_win_score,
        AVG(IIF(game_win = 0, game_score, null)) AS avg_loss_score,
        (SUM(game_win)/10)/COUNT(*) AS win_rate,
        1-(SUM(game_win)/10)/COUNT(*) AS loss_rate
    from spirit_game_data_raw
    group by spirit_name
),

--start of accolade macro loop

{% for accolade in accolades %}
    {{ accolade_cte(accolade) }}

    {% if not loop.last %}
    ,
    {% endif %}
{% endfor %}

-- end of accolade macro loop

stb AS (
    select
        '001' AS accolade_id,
        'Simply the Best' AS accolade_name,
        'highest average score' AS accolade_description,
        spirit_name
    from spirit_game_data_agg
    where avg_game_score = (SELECT MAX(avg_game_score) FROM spirit_game_data_agg)
    order by spirit_name
    limit 1
),
wip AS (
    select
        '002' AS accolade_id,
        'WIP' AS accolade_name,
        'lowest average score' AS accolade_description,
        spirit_name
    from spirit_game_data_agg
    where avg_game_score = (SELECT MIN(avg_game_score) FROM spirit_game_data_agg)
    order by spirit_name
    limit 1
),
mvp AS (
    select
        '003' AS accolade_id,
        'MVP' AS accolade_name,
        'highest average score when winning' AS accolade_description,
        spirit_name
    from spirit_game_data_agg
    where avg_win_score = (SELECT MAX(avg_win_score) FROM spirit_game_data_agg)
    order by spirit_name
    limit 1
),
dq AS (
    select
        '004' AS accolade_id,
        'Drama Queen' AS accolade_name,
        'lowest average score when losing' AS accolade_description,
        spirit_name
    from spirit_game_data_agg
    where avg_loss_score = (SELECT MIN(avg_loss_score) FROM spirit_game_data_agg)
    order by spirit_name
    limit 1
),
chbg AS (
    select
        '005' AS accolade_id,
        'It Could Have Been Glorious' AS accolade_name,
        'highest average score when losing' AS accolade_description,
        spirit_name
    from spirit_game_data_agg
    where avg_loss_score = (SELECT MAX(avg_loss_score) FROM spirit_game_data_agg)
    order by spirit_name
    limit 1
),
bawc AS (
    select
        '006' AS accolade_id,
        'I won... But at What Cost?' AS accolade_name,
        'lowest average score when winning' AS accolade_description,
        spirit_name
    from spirit_game_data_agg
    where avg_win_score = (SELECT MIN(avg_win_score) FROM spirit_game_data_agg)
    order by spirit_name
    limit 1
),
wh AS (
    select
        '007' AS accolade_id,
        'Working Hard' AS accolade_name,
        'highest win rate' AS accolade_description,
        spirit_name
    from spirit_game_data_agg
    where win_rate = (SELECT MAX(win_rate) FROM spirit_game_data_agg)
    order by spirit_name
    limit 1
),
hw AS (
    select
        '008' AS accolade_id,
        'Hardly Working' AS accolade_name,
        'lowest win rate' AS accolade_description,
        spirit_name
    from spirit_game_data_agg
    where win_rate = (SELECT MIN(win_rate) FROM spirit_game_data_agg)
    order by spirit_name
    limit 1
)

SELECT * from stb
union all
select * from wip
union all
select * from mvp
union all
select * from dq
union all
select * from chbg
union all
select * from bawc