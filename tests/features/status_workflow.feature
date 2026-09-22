Feature: Status workflow
  As a user
  I want to move tasks through To Do, In Progress and Done, and reopen them
  So that I can track real progress

  Background:
    Given the task list is empty
    And a task titled "Ship feature"

  Scenario: Advance a task from To Do to In Progress to Done
    When I advance "Ship feature"
    Then "Ship feature" has status "In Progress"
    When I advance "Ship feature"
    Then "Ship feature" has status "Done"

  Scenario: Reopen a completed task
    Given "Ship feature" has status "Done"
    When I advance "Ship feature"
    Then "Ship feature" has status "To Do"
