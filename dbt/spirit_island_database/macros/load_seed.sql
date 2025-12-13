{% macro load_seed(seed_file) %}

  {% set query %}
    SELECT * FROM {{ seed_file }}
  {% endset %}

  {% set results = run_query(query) %}

  {{ return(results) }}

{% endmacro %}