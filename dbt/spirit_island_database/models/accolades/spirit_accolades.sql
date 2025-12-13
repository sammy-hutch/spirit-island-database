{% set accolades = load_seed('accolades') %}

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

{%- for accolade in accolades %}
    {{ accolade_cte(accolade) }}

    {%- if not loop.last %}
    ,
    {%- endif %}

{%- endfor %}

{%- for accolade in accolades %}
    SELECT * FROM {{accolade.abbreviation}}

    {%- if not loop.last %}
    UNION ALL
    {%- endif %}

{%- endfor %}
