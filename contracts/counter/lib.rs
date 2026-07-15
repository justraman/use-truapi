#![cfg_attr(not(feature = "abi-gen"), no_main, no_std)]

#[pvm_contract_sdk::contract(allocator = "pico", allocator_size = 65536)]
mod counter {
    use pvm_contract_sdk::Lazy;

    pub struct Counter {
        #[slot(0)]
        count: Lazy<u64>,
    }

    impl Counter {
        #[pvm_contract_sdk::constructor]
        pub fn new(&mut self) {
            self.count.set(&0);
        }

        #[pvm_contract_sdk::method]
        pub fn get_count(&self) -> u64 {
            self.count.get()
        }

        #[pvm_contract_sdk::method]
        pub fn increment(&mut self) {
            self.count.set(&(self.count.get() + 1));
        }

        #[pvm_contract_sdk::method]
        pub fn add(&mut self, value: u64) {
            self.count.set(&(self.count.get() + value));
        }
    }
}
