{% macro nemesis_cte(nemesis)%}

{% if nemesis.type == 'spirit' %}
    {% set recipient_type = 'adversary' %}
    {% set agg_func = 'MIN' %}
    {% set order_cond = 'loss' %}
    {% set order_func = 'ASC' %}
{% else %}
    {% set recipient_type = 'spirit' %}
    {% set agg_func = 'MAX' %}
    {% set order_cond = 'win' %}
    {% set order_func = 'DESC' %}
{% endif %}

"nemesis_to_{{nemesis.name}}" AS (
    select
        "{{nemesis.type}}_nemesis_{{nemesis.id}}" AS accolade_id,
        "{{nemesis.nemesis_name}}" AS accolade_name,
        "nemesis_to_{{nemesis.name}}" AS accolade_description,
        {{recipient_type}}_name AS accolade_recipient
    from game_data_agg
    where win_rate = (
        select {{agg_func}}(win_rate)
        from game_data_agg
        where {{nemesis.type}}_name = '{{nemesis.name}}'
    )
    order by avg_{{order_cond}}_score {{order_func}}
    limit 1
)

{% endmacro %}