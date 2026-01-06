// InputSystem for Stick & Shift
// Handles keyboard and mouse input with responsive controls

import Phaser from 'phaser';

export interface InputState {
  // Movement
  moveX: number;  // -1 to 1
  moveY: number;  // -1 to 1
  isMoving: boolean;
  
  // Actions
  shoot: boolean;
  shootHeld: boolean;
  shootReleased: boolean;
  pass: boolean;
  tackle: boolean;
  dodge: boolean;
  
  // Mouse
  aimAngle: number;
  aimX: number;
  aimY: number;
  mouseDown: boolean;
  
  // UI
  pause: boolean;
  confirm: boolean;
  cancel: boolean;
}

export class InputSystem {
  private scene: Phaser.Scene;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private actionKeys?: {
    space: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
    q: Phaser.Input.Keyboard.Key;
    escape: Phaser.Input.Keyboard.Key;
    enter: Phaser.Input.Keyboard.Key;
  };
  
  private previousState: Partial<InputState> = {};
  private shootChargeStart: number = 0;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeyboard();
  }
  
  private setupKeyboard(): void {
    if (!this.scene.input.keyboard) return;
    
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    
    this.wasd = {
      W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    
    this.actionKeys = {
      space: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      shift: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      e: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      q: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      escape: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      enter: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    };
  }
  
  getState(playerX: number = 0, playerY: number = 0): InputState {
    const state: InputState = {
      moveX: 0,
      moveY: 0,
      isMoving: false,
      shoot: false,
      shootHeld: false,
      shootReleased: false,
      pass: false,
      tackle: false,
      dodge: false,
      aimAngle: 0,
      aimX: 0,
      aimY: 0,
      mouseDown: false,
      pause: false,
      confirm: false,
      cancel: false
    };
    
    // Movement from arrow keys
    if (this.cursors) {
      if (this.cursors.left.isDown) state.moveX -= 1;
      if (this.cursors.right.isDown) state.moveX += 1;
      if (this.cursors.up.isDown) state.moveY -= 1;
      if (this.cursors.down.isDown) state.moveY += 1;
    }
    
    // Movement from WASD
    if (this.wasd) {
      if (this.wasd.A.isDown) state.moveX -= 1;
      if (this.wasd.D.isDown) state.moveX += 1;
      if (this.wasd.W.isDown) state.moveY -= 1;
      if (this.wasd.S.isDown) state.moveY += 1;
    }
    
    // Normalize diagonal movement
    if (state.moveX !== 0 && state.moveY !== 0) {
      const length = Math.sqrt(state.moveX * state.moveX + state.moveY * state.moveY);
      state.moveX /= length;
      state.moveY /= length;
    }
    
    state.isMoving = state.moveX !== 0 || state.moveY !== 0;
    
    // Actions
    if (this.actionKeys) {
      // Shoot - detect press, hold, and release
      const spaceDown = this.actionKeys.space.isDown;
      state.shoot = Phaser.Input.Keyboard.JustDown(this.actionKeys.space);
      state.shootHeld = spaceDown;
      state.shootReleased = Phaser.Input.Keyboard.JustUp(this.actionKeys.space);
      
      // Track charge time
      if (state.shoot) {
        this.shootChargeStart = this.scene.time.now;
      }
      
      // Other actions
      state.dodge = Phaser.Input.Keyboard.JustDown(this.actionKeys.shift);
      state.pass = Phaser.Input.Keyboard.JustDown(this.actionKeys.e);
      state.tackle = Phaser.Input.Keyboard.JustDown(this.actionKeys.q);
      
      // UI
      state.pause = Phaser.Input.Keyboard.JustDown(this.actionKeys.escape);
      state.confirm = Phaser.Input.Keyboard.JustDown(this.actionKeys.enter);
      state.cancel = Phaser.Input.Keyboard.JustDown(this.actionKeys.escape);
    }
    
    // Mouse aiming
    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    
    state.aimX = worldPoint.x;
    state.aimY = worldPoint.y;
    state.aimAngle = Phaser.Math.Angle.Between(playerX, playerY, worldPoint.x, worldPoint.y);
    state.mouseDown = pointer.isDown;
    
    // Store previous state for edge detection
    this.previousState = { ...state };
    
    return state;
  }
  
  // Get how long shoot has been held (for charge shots)
  getShootChargeTime(): number {
    if (this.actionKeys?.space.isDown) {
      return this.scene.time.now - this.shootChargeStart;
    }
    return 0;
  }
  
  // Get charge percentage (0-1, capped at 1 second)
  getShootChargePct(): number {
    return Math.min(this.getShootChargeTime() / 1000, 1);
  }
  
  // Check if a specific key is down
  isKeyDown(key: string): boolean {
    const keyObj = this.scene.input.keyboard?.addKey(key);
    return keyObj?.isDown || false;
  }
  
  // Disable input (for cutscenes, etc.)
  disable(): void {
    this.scene.input.keyboard?.enabled && (this.scene.input.keyboard.enabled = false);
  }
  
  // Enable input
  enable(): void {
    this.scene.input.keyboard && (this.scene.input.keyboard.enabled = true);
  }
  
  // Clean up
  destroy(): void {
    // Keys are automatically cleaned up with the scene
  }
}
