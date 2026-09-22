Feature: Task CRUD
  As a user
  I want to create, edit, and delete tasks
  So that I can keep my task list accurate

  Background:
    Given the task list is empty

  Scenario: Create a task
    When I add a task titled "Write report" with priority "High"
    Then the task list contains "Write report"
    And "Write report" has priority "High"

  Scenario: Reject a task with an empty title
    When I try to add a task titled ""
    Then I see a validation error
    And the task list is empty

  Scenario: Edit a task's title
    Given a task titled "Draft"
    When I edit it to "Final draft"
    Then the task list contains "Final draft"
    And the task list does not contain "Draft"

  Scenario: Delete a task
    Given a task titled "Old task"
    When I delete "Old task"
    Then the task list does not contain "Old task"
