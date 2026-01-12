{% macro load_dim(dim_table, dim_type, include_playtest=False) %}

  {% set query %}
    SELECT  
        {{ dim_type }}_id AS id,
        {{ dim_type }}_name AS name,
        nemesis_name AS nemesis_name,
        "{{ dim_type}}" AS type
    FROM {{ dim_table }}
    {% if not include_playtest %}
      WHERE {{ dim_type }}_name NOT LIKE "%custom%"
    {% endif %}
  {% endset %}

  {% set results = run_query(query) %}

  {{ return(results) }}

{% endmacro %}