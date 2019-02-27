let assert = require('assert');
const c = require('../src/moved_block_detector');

describe('Line', function() {
  it('line_end is set to line_start', function() {
    const file = "some_file";
    const line_1 = new c.Line(file, 12, "some_text");
    const line_2 = new c.Line(file, 13, "some_text2");
    assert.strictEqual(line_1.is_line_before(line_2), true)
  });

  it('calculating leading whitespaces', function() {
    const line = new c.Line("file", 12, "    some_text   ");
    assert.strictEqual(line.leading_whitespaces, "   ");
    assert.strictEqual(line.trim_text, "some_text")
  });

  it('calculate indentation change', function() {
    const line_removed = new c.Line("file", 12, "    some_text   ");
    const line_added = new c.Line("file2", 100, "         some_text   ");
    let indentation = line_removed.calculate_indentation_change(line_added);
    assert.strictEqual(indentation.indent_type, c.IndentationType.ADDED);
    assert.strictEqual(indentation.whitespace, "     ");

    // now the other way (from added to removed)
    indentation = line_added.calculate_indentation_change(line_removed);
    assert.strictEqual(indentation.indent_type, c.IndentationType.REMOVED);
    assert.strictEqual(indentation.whitespace, "     ")
  });

  it('lines are matching with changed indentation', function() {
    let line_removed = new c.Line("file", 12, "    some_text");
    let line_added = new c.Line("file2", 100, "         some_text   ");
    let indentation = line_removed.calculate_indentation_change(line_added);
    assert.strictEqual(indentation.indent_type, c.IndentationType.ADDED);
    assert.strictEqual(indentation.whitespace, "     ");
    let lines_are_matching = c.Line.lines_match_with_changed_indentation(line_removed, line_added, indentation);
    assert.strictEqual(lines_are_matching, true);

    line_removed = new c.Line("file", 12, "    some_text");
    line_added = new c.Line("file2", 100, " some_text");
    indentation = line_removed.calculate_indentation_change(line_added);
    assert.strictEqual(indentation.indent_type, c.IndentationType.REMOVED);
    assert.strictEqual(indentation.whitespace, "   ");
    lines_are_matching = c.Line.lines_match_with_changed_indentation(line_removed, line_added, indentation);
    assert.strictEqual(lines_are_matching, true);

    line_removed = new c.Line("file", 12, "    some_text");
    line_added = new c.Line("file2", 100, "    some_text");
    indentation = line_removed.calculate_indentation_change(line_added);
    assert.strictEqual(indentation.indent_type, c.IndentationType.ADDED);
    assert.strictEqual(indentation.whitespace, "");
    lines_are_matching = c.Line.lines_match_with_changed_indentation(line_removed, line_added, indentation);
    assert.strictEqual(lines_are_matching, true);
  });
});

describe('MatchingBlock', function() {
  it('extend MatchingBlock block with new line', function() {
    const file1 = "some_file";
    const file2 = "some_file2";
    const removed_line_1 = new c.Line(file1, 2, "some_text");
    const added_line_1 = new c.Line(file2, 12, "some_text");
    const matching_block = new c.MatchingBlock(removed_line_1, added_line_1);
    const removed_line_2 = new c.Line(file1, 3, "some_text2");
    const added_line_2 = new c.Line(file2, 13, "some_text2");
    let extended = matching_block.try_extend_with_line(removed_line_2, added_line_2);
    assert.strictEqual(extended, true);
    assert.strictEqual(matching_block.last_removed_line.line_no, 3);
    assert.strictEqual(matching_block.last_added_line.line_no, 13);
    assert.strictEqual(matching_block.lines.length, 2);

    // now try expanding one more time with the same lines - it should not succeed
    extended = matching_block.try_extend_with_line(removed_line_2, added_line_2);
    assert.strictEqual(extended, false);
    assert.strictEqual(matching_block.last_removed_line.line_no, 3);
    assert.strictEqual(matching_block.last_added_line.line_no, 13)
    assert.strictEqual(matching_block.lines.length, 2);
  });

  it('extend MatchingBlock block with new line ver 2', function() {
    const removed_line_1 = new c.Line("file_with_removed_lines", 1, "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1");
    const added_line_1 = new c.Line("file_with_added_lines", 12, "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1");
    const matching_block = new c.MatchingBlock(removed_line_1, added_line_1);
    const removed_line_2 = new c.Line("file_with_removed_lines", 2, "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2");
    const added_line_2 = new c.Line("file_with_added_lines", 13, "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2");
    let extended = matching_block.try_extend_with_line(removed_line_2, added_line_2);
    assert.strictEqual(extended, true);
    assert.strictEqual(matching_block.last_removed_line.line_no, 2);
    assert.strictEqual(matching_block.last_added_line.line_no, 13);
    assert.strictEqual(matching_block.lines.length, 2);
  });
});

class ChangedLines {
  constructor(file, line_no_to_text){
    this.file = file;
    this.line_no_to_text = line_no_to_text;
  }

  to_array() {
    let result = [];
    for (const line_no of Object.keys(this.line_no_to_text)) {
      result.push(new c.Line(this.file, parseInt(line_no), this.line_no_to_text[line_no]))
    }
    return result;
  }
}

function no_op(x) {
  return x;
}

describe('MovedBlocksDetector', function() {
  it('simple 1 moved block', function() {
    let removed_lines = new ChangedLines("file_with_removed_lines", {
      1: "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1",
      2: "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2",
      3: "3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3",
      4: "4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4",
      5: "5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5"
    });

    let added_lines = new ChangedLines("file_with_added_lines", {
      10: "-------------------------------------------",
      11: "-------------------------------------------",
      12: "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1",
      13: "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2",
      14: "3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3",
      15: "4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4",
      16: "-------------------------------------------",
    });

    let detector = new c.MovedBlocksDetector(removed_lines.to_array(), added_lines.to_array(), no_op);
    let detected_blocks = detector.detect_moved_blocks();
    assert.strictEqual(detected_blocks.length, 1);
    assert.strictEqual(detected_blocks[0].lines[0].removed_line.line_no, 1);
    assert.strictEqual(detected_blocks[0].lines[0].added_line.line_no, 12);
    assert.strictEqual(detected_blocks[0].last_removed_line.line_no, 4);
    assert.strictEqual(detected_blocks[0].last_added_line.line_no, 15);
    assert.strictEqual(detected_blocks[0].line_count, 4);
    assert.strictEqual(detected_blocks[0].char_count, 4 * 43);
  });

  it('move block to 2 parts in 2 files', function() {
    let removed_lines = new ChangedLines("file_with_removed_lines", {
      1: "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1",
      2: "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2",
      3: "3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3",
      4: "4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4",
      5: "5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5",
      6: "6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6",
      7: "7 7 7 7 7 7 7 7 7 7 7 7 7 7 7 7 7 7 7 7 7 7",
      8: "8 8 8 8 8 8 8 8 8 8 8 8 8 8 8 8 8 8 8 8 8 8",
      9: "9 9 9 9 9 9 9 9 9 9 9 9 9 9 9 9 9 9 9 9 9 9",
    });

    let added_lines_1 = new ChangedLines("file_with_added_lines_1", {
      10: "-------------------------------------------",
      13: "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2",
      14: "3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3",
      15: "4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4",
    });

    let added_lines_2 = new ChangedLines("file_with_added_lines_2", {
      10: "-------------------------------------------",
      14: "3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3",
      15: "4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4",
      16: "5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5",
      17: "6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6 6",
      18: "-------------------------------------------",
    });
    let added_lines = added_lines_1.to_array().concat(added_lines_2.to_array());
    let detector = new c.MovedBlocksDetector(removed_lines.to_array(), added_lines, no_op);
    let detected_blocks = detector.detect_moved_blocks();
    assert.strictEqual(detected_blocks.length, 2);
    assert.strictEqual(detected_blocks[0].lines[0].removed_line.line_no, 2);
    assert.strictEqual(detected_blocks[0].lines[0].added_line.line_no, 13);
    assert.strictEqual(detected_blocks[0].last_removed_line.line_no, 4);
    assert.strictEqual(detected_blocks[0].last_added_line.line_no, 15);
    assert.strictEqual(detected_blocks[0].line_count, 3);
    assert.strictEqual(detected_blocks[0].char_count, 3 * 43);

    assert.strictEqual(detected_blocks[1].lines[0].removed_line.line_no, 3);
    assert.strictEqual(detected_blocks[1].lines[0].added_line.line_no, 14);
    assert.strictEqual(detected_blocks[1].last_removed_line.line_no, 6);
    assert.strictEqual(detected_blocks[1].last_added_line.line_no, 17);
    assert.strictEqual(detected_blocks[1].line_count, 4);
    assert.strictEqual(detected_blocks[1].char_count, 4 * 43);
  });

  it('detect block with changed indentation', function() {
    let removed_lines = new ChangedLines("file_with_removed_lines", {
      1: "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1",
      2: "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2",
      3: "3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3",
      4: "4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4",
      5: "5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5"
    });

    let added_lines = new ChangedLines("file_with_added_lines", {
      10: "-------------------------------------------",
      11: "-------------------------------------------",
      12: "   1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1",
      13: "   2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2",
      14: "   3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3",
      15: "   4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4",
      16: "-------------------------------------------",
    });

    let detector = new c.MovedBlocksDetector(removed_lines.to_array(), added_lines.to_array(), no_op);
    let detected_blocks = detector.detect_moved_blocks();
    assert.strictEqual(detected_blocks.length, 1);
    assert.strictEqual(detected_blocks[0].lines[0].removed_line.line_no, 1);
    assert.strictEqual(detected_blocks[0].lines[0].added_line.line_no, 12);
    assert.strictEqual(detected_blocks[0].last_removed_line.line_no, 4);
    assert.strictEqual(detected_blocks[0].last_added_line.line_no, 15);
    assert.strictEqual(detected_blocks[0].line_count, 4);
    assert.strictEqual(detected_blocks[0].char_count, 4 * 43);
  });

  it('do not merge block with inconsistent changed indentation', function() {
    let removed_lines = new ChangedLines("file_with_removed_lines", {
      1: "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1",
      2: "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2",
      3: "3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3",
      4: "4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4",
      5: "5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5"
    });

    let added_lines = new ChangedLines("file_with_added_lines", {
      10: "-------------------------------------------",
      11: "-------------------------------------------",
      12: "   1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1",
      13: "   2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2",
      14: "      3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3",
      15: "      4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4",
      16: "-------------------------------------------",
    });

    let detector = new c.MovedBlocksDetector(removed_lines.to_array(), added_lines.to_array(), no_op);
    let detected_blocks = detector.detect_moved_blocks();
    assert.strictEqual(detected_blocks.length, 2);
    assert.strictEqual(detected_blocks[0].lines[0].removed_line.line_no, 1);
    assert.strictEqual(detected_blocks[0].lines[0].added_line.line_no, 12);
    assert.strictEqual(detected_blocks[0].last_removed_line.line_no, 2);
    assert.strictEqual(detected_blocks[0].last_added_line.line_no, 13);
    assert.strictEqual(detected_blocks[0].line_count, 2);
    assert.strictEqual(detected_blocks[0].char_count, 2 * 43);

    assert.strictEqual(detected_blocks[1].lines[0].removed_line.line_no, 3);
    assert.strictEqual(detected_blocks[1].lines[0].added_line.line_no, 14);
    assert.strictEqual(detected_blocks[1].last_removed_line.line_no, 4);
    assert.strictEqual(detected_blocks[1].last_added_line.line_no, 15);
    assert.strictEqual(detected_blocks[1].line_count, 2);
    assert.strictEqual(detected_blocks[1].char_count, 2 * 43);
  });

  it('remove single line add it many times', function() {
    let removed_file = "file_with_removed_lines";
    let added_file = "file_with_added_lines";
    let removed_lines = new ChangedLines(removed_file, {
      1: "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1",
    });

    let added_lines = new ChangedLines(added_file, {
      10: "-------------------------------------------",
      11: "-------------------------------------------",
      12: "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1",
      13: "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1",
      14: "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1",
    });

    let detector = new c.MovedBlocksDetector(removed_lines.to_array(), added_lines.to_array(), no_op);
    let detected_blocks = detector.detect_moved_blocks();
    assert.strictEqual(detected_blocks.length, 3);
    assert.strictEqual(detected_blocks[0].lines[0].removed_line.line_no, 1);
    assert.strictEqual(detected_blocks[0].lines[0].added_line.line_no, 12);
    assert.strictEqual(detected_blocks[0].last_removed_line.line_no, 1);
    assert.strictEqual(detected_blocks[0].last_added_line.line_no, 12);
    assert.strictEqual(detected_blocks[0].line_count, 1);

    assert.strictEqual(detected_blocks[1].lines[0].removed_line.line_no, 1);
    assert.strictEqual(detected_blocks[1].lines[0].added_line.line_no, 13);
    assert.strictEqual(detected_blocks[1].last_removed_line.line_no, 1);
    assert.strictEqual(detected_blocks[1].last_added_line.line_no, 13);
    assert.strictEqual(detected_blocks[1].line_count, 1);

    assert.strictEqual(detected_blocks[2].lines[0].removed_line.line_no, 1);
    assert.strictEqual(detected_blocks[2].lines[0].added_line.line_no, 14);
    assert.strictEqual(detected_blocks[2].last_removed_line.line_no, 1);
    assert.strictEqual(detected_blocks[2].last_added_line.line_no, 14);
    assert.strictEqual(detected_blocks[2].line_count, 1);
  });

  it('filer out small blocks', function() {
    let removed_lines = new ChangedLines("file_with_removed_lines", {
      1: "1 1 1",
      2: "2 2 2",
    });

    let added_lines = new ChangedLines("file_with_added_lines", {
      11: "1 1 1",
      12: "2 2 2",
    });

    let detector = new c.MovedBlocksDetector(removed_lines.to_array(), added_lines.to_array(), no_op);
    let detected_blocks = detector.detect_moved_blocks();
    assert.strictEqual(detected_blocks.length, 0);
  });

  it('even single line block can be detected if it is long enough', function() {
    // now check that even single line block can be detected if it is long enough
    let removed_lines = new ChangedLines("file_with_removed_lines", {
      1: "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1",
    });

    let added_lines = new ChangedLines("file_with_added_lines", {
      11: "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1",
    });

    let detector = new c.MovedBlocksDetector(removed_lines.to_array(), added_lines.to_array(), no_op);
    let detected_blocks = detector.detect_moved_blocks();
    assert.strictEqual(detected_blocks.length, 1);
  })
});
