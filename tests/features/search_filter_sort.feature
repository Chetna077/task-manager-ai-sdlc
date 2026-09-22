Feature: Search, filter and sort
  As a user
  I want to search, filter, and sort my tasks
  So that I can find what matters in a long list

  Background:
    Given the task list is empty
    And a task titled "Write report" with priority "High" and status "To Do"
    And a task titled "Fix bug" with priority "Low" and status "Done"
    And a task titled "Write email" with priority "Medium" and status "To Do"

  Scenario: Search by title substring
    When I search for "write"
    Then the task list contains "Write report"
    And the task list contains "Write email"
    And the task list does not contain "Fix bug"

  Scenario: Filter by status
    When I filter by status "Done"
    Then the task list contains "Fix bug"
    And the task list does not contain "Write report"

  Scenario: Filter by priority
    When I filter by priority "High"
    Then the task list contains "Write report"
    And the task list does not contain "Fix bug"

  Scenario: Combine search and filter
    When I search for "write"
    And I filter by status "To Do"
    Then the task list contains "Write report"
    And the task list contains "Write email"
    And the task list does not contain "Fix bug"

  Scenario: Sort by priority descending
    When I sort by "priority" descending
    Then the first task in the list is "Write report"
